import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

/**
 * How a Daraja result code should be interpreted by the rest of the platform.
 * `PROCESSING` means Safaricom has not decided yet — never treat it as final.
 */
export type MpesaOutcome = 'SUCCESS' | 'CANCELLED' | 'EXPIRED' | 'FAILED' | 'PROCESSING';

export interface StkQueryResult {
  /** Safaricom's verdict, when it has one. */
  outcome: MpesaOutcome;
  resultCode?: string;
  resultDesc?: string;
  /**
   * True when the query itself could not be completed (network, auth, Daraja
   * outage). The transaction state is *unknown* — callers must not finalise a
   * payment on the strength of an unavailable query.
   */
  unavailable: boolean;
}

/**
 * Daraja STK result codes. Anything not listed is treated as a plain failure,
 * which is the safe default: we never issue a ticket for a code we don't know.
 */
const RESULT_CODE_MAP: Record<string, { outcome: MpesaOutcome; message: string }> = {
  '0': { outcome: 'SUCCESS', message: 'Payment received.' },
  '1': { outcome: 'FAILED', message: 'The M-Pesa balance was not enough to complete this payment.' },
  '17': { outcome: 'FAILED', message: 'M-Pesa could not process the request. Please try again.' },
  '26': { outcome: 'FAILED', message: 'M-Pesa is busy right now. Please try again in a moment.' },
  '1001': { outcome: 'FAILED', message: 'Another M-Pesa transaction is already running on this number.' },
  '1019': { outcome: 'EXPIRED', message: 'The M-Pesa request expired before it was completed.' },
  '1025': { outcome: 'FAILED', message: 'M-Pesa could not deliver the payment request.' },
  '1032': { outcome: 'CANCELLED', message: 'The M-Pesa request was cancelled on the phone.' },
  '1037': { outcome: 'EXPIRED', message: 'The M-Pesa request timed out with no response from the phone.' },
  '1101': { outcome: 'FAILED', message: 'The M-Pesa payment could not be completed.' },
  '2001': { outcome: 'FAILED', message: 'The M-Pesa PIN entered was not correct.' },
  '9999': { outcome: 'FAILED', message: 'M-Pesa reported an error while processing the payment.' },
};

/** Daraja's "we have it, but there is no answer yet" reply to a status query. */
const QUERY_IN_FLIGHT_ERROR_CODES = new Set(['500.001.1001']);

const REQUIRED_CONFIG = [
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_SHORTCODE',
  'MPESA_PASSKEY',
  'MPESA_CALLBACK_URL',
] as const;

/**
 * Modular Safaricom Daraja (M-Pesa) integration.
 * Keep all provider-specific logic isolated here so other providers
 * (Flutterwave, Paystack, card) can be added as siblings under src/payments
 * without touching the orders/payments domain logic.
 *
 * Everything that leaves this process carries an explicit timeout and a bounded
 * retry: a Daraja socket that never answers would otherwise hang the customer's
 * checkout indefinitely, and a single transient blip would kill a sale outright.
 */
@Injectable()
export class MpesaService {
  private readonly logger = new Logger('MpesaService');

  /**
   * OAuth tokens are valid for an hour. Cached with a safety margin so a burst
   * of checkouts does not hammer the token endpoint, and always re-issued once
   * expired — a customer coming back after days gets a fresh token, never a
   * stale one. `expiresAt` is absolute wall-clock, so an idle instance waking up
   * cannot resurrect a dead token.
   */
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private configService: ConfigService) {}

  private get baseUrl() {
    const env = this.configService.get<string>('MPESA_ENV') || 'sandbox';
    return env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  }

  private get timeoutMs(): number {
    return parseInt(this.configService.get<string>('MPESA_HTTP_TIMEOUT_MS') || '20000', 10);
  }

  private get maxRetries(): number {
    return parseInt(this.configService.get<string>('MPESA_HTTP_RETRIES') || '2', 10);
  }

  /**
   * Fails loudly and early when credentials are missing, instead of letting a
   * blank consumer key turn into an opaque 400 from Daraja.
   */
  assertConfigured(): void {
    const missing = REQUIRED_CONFIG.filter((key) => !this.configService.get<string>(key));
    if (missing.length > 0) {
      this.logger.error(`M-Pesa is not configured — missing ${missing.join(', ')}`);
      throw new ServiceUnavailableException('M-Pesa payments are not configured on this environment.');
    }
  }

  /** True for failures where retrying is safe and likely to help. */
  private isTransient(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;
    const err = error as AxiosError;
    if (!err.response) return true; // timeout / DNS / connection reset — never reached Daraja

    // Daraja answers business-level problems with HTTP 500 and an errorCode in
    // the body ("transaction is being processed", "invalid CheckoutRequestID").
    // Those are answers, not faults — replaying them just burns the timeout.
    if ((err.response.data as any)?.errorCode) return false;

    const status = err.response.status;
    return status === 429 || status >= 500;
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Bounded exponential backoff. `retryOn` lets callers narrow what counts as
   * retryable — the STK push only retries when no HTTP response came back at
   * all, so a Daraja 5xx that may already have rung the customer's phone is
   * never replayed into a second prompt.
   */
  private async withRetry<T>(
    label: string,
    fn: () => Promise<T>,
    retryOn: (error: unknown) => boolean = (e) => this.isTransient(e),
    attempts = this.maxRetries,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt === attempts || !retryOn(error)) break;
        const backoff = 500 * 2 ** attempt + Math.floor(Math.random() * 250);
        this.logger.warn(`${label} failed (attempt ${attempt + 1}/${attempts + 1}), retrying in ${backoff}ms`);
        await this.delay(backoff);
      }
    }
    throw lastError;
  }

  /** Step 1: OAuth access token using consumer key/secret (Basic auth). */
  async generateAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.value;
    }

    const consumerKey = this.configService.get<string>('MPESA_CONSUMER_KEY');
    const consumerSecret = this.configService.get<string>('MPESA_CONSUMER_SECRET');
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await this.withRetry('M-Pesa token request', () =>
      axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${credentials}` },
        timeout: this.timeoutMs,
      }),
    );

    const token = response.data?.access_token;
    if (!token) {
      this.cachedToken = null;
      throw new Error('Daraja returned no access token');
    }

    // Daraja reports expires_in in seconds (3599). Renew two minutes early so a
    // token can never expire mid-request.
    const lifetimeSeconds = parseInt(String(response.data.expires_in ?? '3599'), 10) || 3599;
    this.cachedToken = {
      value: token,
      expiresAt: Date.now() + Math.max(lifetimeSeconds - 120, 60) * 1000,
    };

    return token;
  }

  /** Discards the cached token so the next call re-authenticates. */
  invalidateAccessToken(): void {
    this.cachedToken = null;
  }

  /**
   * Runs an authenticated Daraja call, re-authenticating once if the token is
   * rejected. Without this, a token invalidated on Safaricom's side (credential
   * rotation, a reset on their end) would fail every payment until this process
   * was restarted.
   */
  private async authorized<T>(label: string, call: (token: string) => Promise<T>): Promise<T> {
    try {
      return await call(await this.generateAccessToken());
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status !== 401 && status !== 403) throw error;
      this.logger.warn(`${label} was rejected with ${status} — refreshing the M-Pesa access token`);
      this.invalidateAccessToken();
      return call(await this.generateAccessToken(true));
    }
  }

  /** Daraja requires timestamps in YYYYMMDDHHmmss format. */
  generateTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds())
    );
  }

  /** Password = Base64(Shortcode + Passkey + Timestamp), per Daraja spec. */
  generatePassword(timestamp: string): string {
    const shortcode = this.configService.get<string>('MPESA_SHORTCODE');
    const passkey = this.configService.get<string>('MPESA_PASSKEY');
    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  }

  /**
   * Step 2: Initiate an STK Push (Lipa na M-Pesa Online) prompt on the
   * customer's phone for the given amount.
   */
  async initiateStkPush(params: {
    phone: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
  }): Promise<StkPushResult> {
    this.assertConfigured();

    const shortcode = this.configService.get<string>('MPESA_SHORTCODE');
    const callbackUrl = this.configService.get<string>('MPESA_CALLBACK_URL');

    let response: any;
    try {
      response = await this.authorized('STK push', async (accessToken) => {
        // Password and timestamp are bound together, so both are regenerated on
        // every attempt — Daraja rejects a stale timestamp.
        const timestamp = this.generateTimestamp();
        const password = this.generatePassword(timestamp);

        const payload = {
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.ceil(params.amount),
          PartyA: this.normalizePhone(params.phone),
          PartyB: shortcode,
          PhoneNumber: this.normalizePhone(params.phone),
          CallBackURL: callbackUrl,
          AccountReference: this.sanitizeField(params.accountReference, 12),
          TransactionDesc: this.sanitizeField(params.transactionDesc, 13),
        };

        return this.withRetry(
          'STK push',
          () =>
            axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
              headers: { Authorization: `Bearer ${accessToken}` },
              timeout: this.timeoutMs,
            }),
          // Only replay when Daraja never answered. A 5xx may already have sent
          // the prompt, and two prompts for one order is worse than one retry.
          (error) => axios.isAxiosError(error) && !error.response,
          1,
        );
      });
    } catch (error: any) {
      this.logger.error('STK Push failed', error?.response?.data || error.message);
      throw error;
    }

    const checkoutRequestId = response.data?.CheckoutRequestID;
    if (!checkoutRequestId) {
      // Without a CheckoutRequestID this payment could never be reconciled, so
      // it must not be recorded as an in-flight request.
      this.logger.error('STK Push returned no CheckoutRequestID', response.data);
      throw new Error('Daraja accepted the request but returned no CheckoutRequestID');
    }

    return {
      merchantRequestId: response.data.MerchantRequestID,
      checkoutRequestId,
      responseCode: String(response.data.ResponseCode),
      responseDescription: response.data.ResponseDescription,
      customerMessage: response.data.CustomerMessage,
    };
  }

  /**
   * Step 3: Ask Safaricom what actually happened to an STK push.
   *
   * This is the safety net that makes settlement independent of the callback
   * ever arriving — a callback can be lost to a sleeping instance, a rotated
   * tunnel URL or a network drop, and without this the order would sit PENDING
   * forever with its stock still reserved.
   */
  async queryStkStatus(checkoutRequestId: string): Promise<StkQueryResult> {
    const shortcode = this.configService.get<string>('MPESA_SHORTCODE');

    try {
      this.assertConfigured();

      const response = await this.authorized('STK query', async (accessToken) => {
        const timestamp = this.generateTimestamp();
        const password = this.generatePassword(timestamp);

        return this.withRetry('STK query', () =>
          axios.post(
            `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
            {
              BusinessShortCode: shortcode,
              Password: password,
              Timestamp: timestamp,
              CheckoutRequestID: checkoutRequestId,
            },
            { headers: { Authorization: `Bearer ${accessToken}` }, timeout: this.timeoutMs },
          ),
        );
      });

      const resultCode = response.data?.ResultCode;
      if (resultCode === undefined || resultCode === null) {
        return { outcome: 'PROCESSING', unavailable: true };
      }

      return {
        outcome: this.classifyResultCode(resultCode).outcome,
        resultCode: String(resultCode),
        resultDesc: response.data?.ResultDesc,
        unavailable: false,
      };
    } catch (error: any) {
      const data = error?.response?.data;
      const errorCode = data?.errorCode ? String(data.errorCode) : undefined;

      // "The transaction is being processed" — the customer still has the prompt
      // open, or has just submitted their PIN. Not final, and not an error.
      if (errorCode && QUERY_IN_FLIGHT_ERROR_CODES.has(errorCode)) {
        return { outcome: 'PROCESSING', resultDesc: data?.errorMessage, unavailable: false };
      }

      this.logger.warn(
        `STK query for ${checkoutRequestId} could not be completed: ${
          data ? JSON.stringify(data) : error?.message
        }`,
      );
      return { outcome: 'PROCESSING', unavailable: true };
    }
  }

  /** Maps a Daraja result code onto a platform outcome plus buyer-facing copy. */
  classifyResultCode(resultCode: string | number | null | undefined): {
    outcome: MpesaOutcome;
    message: string;
  } {
    if (resultCode === null || resultCode === undefined || resultCode === '') {
      return { outcome: 'PROCESSING', message: 'Waiting for M-Pesa to confirm this payment.' };
    }
    return (
      RESULT_CODE_MAP[String(resultCode)] ?? {
        outcome: 'FAILED',
        message: 'The M-Pesa payment could not be completed. Please try again.',
      }
    );
  }

  /**
   * Daraja processes the request through an XML pipeline that breaks on
   * XML-special characters (e.g. the "&" in "R&B" returns an
   * XSLEvaluationFailed 500), and the API spec caps AccountReference at 12
   * and TransactionDesc at 13 characters.
   */
  sanitizeField(text: string, maxLength: number): string {
    const cleaned = text.replace(/[^A-Za-z0-9 ._-]/g, ' ').replace(/\s+/g, ' ').trim();
    return (cleaned || 'Payment').slice(0, maxLength);
  }

  /** Normalizes 07xxxxxxxx / 01xxxxxxxx / +254xxxxxxxxx / 254xxxxxxxxx to 254xxxxxxxxx. */
  normalizePhone(phone: string): string {
    let normalized = phone.trim().replace(/\s+/g, '');
    if (normalized.startsWith('+')) normalized = normalized.slice(1);
    if (normalized.startsWith('0')) normalized = `254${normalized.slice(1)}`;
    if (normalized.startsWith('7') || normalized.startsWith('1')) normalized = `254${normalized}`;
    return normalized;
  }

  /** Parses the CallbackMetadata array Safaricom sends on a successful STK push. */
  extractReceiptFromCallback(callbackMetadata: any): string | undefined {
    const items = callbackMetadata?.Item || [];
    const receiptItem = items.find((i: any) => i.Name === 'MpesaReceiptNumber');
    return receiptItem?.Value;
  }
}
