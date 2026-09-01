import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

/**
 * Modular Safaricom Daraja (M-Pesa) integration.
 * Keep all provider-specific logic isolated here so other providers
 * (Flutterwave, Paystack, card) can be added as siblings under src/payments
 * without touching the orders/payments domain logic.
 */
@Injectable()
export class MpesaService {
  private readonly logger = new Logger('MpesaService');

  constructor(private configService: ConfigService) {}

  private get baseUrl() {
    const env = this.configService.get<string>('MPESA_ENV') || 'sandbox';
    return env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  }

  /** Step 1: OAuth access token using consumer key/secret (Basic auth). */
  async generateAccessToken(): Promise<string> {
    const consumerKey = this.configService.get<string>('MPESA_CONSUMER_KEY');
    const consumerSecret = this.configService.get<string>('MPESA_CONSUMER_SECRET');
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${credentials}` },
    });

    return response.data.access_token;
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
    this.assertPhoneAllowedForSandbox(params.phone);

    const accessToken = await this.generateAccessToken();
    const timestamp = this.generateTimestamp();
    const password = this.generatePassword(timestamp);
    const shortcode = this.configService.get<string>('MPESA_SHORTCODE');
    const callbackUrl = this.configService.get<string>('MPESA_CALLBACK_URL');

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

    try {
      const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return {
        merchantRequestId: response.data.MerchantRequestID,
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage: response.data.CustomerMessage,
      };
    } catch (error: any) {
      this.logger.error('STK Push failed', error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Result codes Daraja returns while an STK push is still in flight, not as
   * its verdict. `4999` is what a query gets back in the seconds after the
   * push, before the customer has acted; `1001` means another transaction is
   * already locking the subscriber. Both mean "no answer yet".
   *
   * Every other non-zero code (1032 cancelled, 1037 not reachable, 1
   * insufficient funds, 2001 wrong PIN, 1019 expired, ...) is final.
   */
  private static readonly IN_PROGRESS_RESULT_CODES = new Set(['1001', '4999']);

  /**
   * Step 3 (fallback): ask Daraja for the final outcome of an STK push
   * instead of waiting to be told.
   *
   * The callback is the fast path, but it only arrives if Safaricom can reach
   * our `MPESA_CALLBACK_URL` over the public internet. On a development
   * machine it cannot, so without this every local payment would sit PENDING
   * forever even after the customer entered their PIN. This closes the loop
   * from our side, and in production it also recovers payments whose callback
   * was lost or delivered while the service was restarting.
   *
   * `settled: false` means "no verdict yet" — the customer still has the
   * prompt open, or Daraja rate-limited us. It is never a failure, and the
   * caller must leave the payment PENDING and ask again later.
   */
  async queryStkStatus(checkoutRequestId: string): Promise<{
    settled: boolean;
    resultCode?: string;
    resultDesc?: string;
  }> {
    const accessToken = await this.generateAccessToken();
    const timestamp = this.generateTimestamp();
    const password = this.generatePassword(timestamp);
    const shortcode = this.configService.get<string>('MPESA_SHORTCODE');

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        { BusinessShortCode: shortcode, Password: password, Timestamp: timestamp, CheckoutRequestID: checkoutRequestId },
        { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 20_000 },
      );

      const resultCode = response.data?.ResultCode;
      // A missing ResultCode means the query itself was accepted but the
      // transaction has no verdict yet — treat it as still in flight.
      if (resultCode === undefined || resultCode === null) return { settled: false };

      const code = String(resultCode);
      const desc: string = response.data?.ResultDesc ?? '';

      // Daraja answers every query, including while the customer still has the
      // PIN prompt open — it just reports an in-progress code. Settling on
      // those would fail a payment that is about to succeed, releasing the
      // held stock while the customer's money is still on its way, so an
      // in-progress answer must be read as "ask again later".
      if (MpesaService.IN_PROGRESS_RESULT_CODES.has(code) || /still under processing|being processed/i.test(desc)) {
        return { settled: false };
      }

      return { settled: true, resultCode: code, resultDesc: desc || undefined };
    } catch (error: any) {
      const data = error?.response?.data;

      // "The transaction is being processed" — the customer has not finished
      // with the prompt. Daraja reports this as a 500 with its own error code,
      // not as a ResultCode, so it must not be mistaken for a failed payment.
      if (data?.errorCode === '500.001.1001') return { settled: false };

      // Spike arrest: Daraja allows ~30 queries/minute per app. Backing off
      // and retrying on the next poll is correct; failing the payment is not.
      if (error?.response?.status === 429) {
        this.logger.warn(`STK query rate-limited for ${checkoutRequestId}; will retry`);
        return { settled: false };
      }

      this.logger.warn(`STK query failed for ${checkoutRequestId}: ${JSON.stringify(data) || error.message}`);
      return { settled: false };
    }
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

  /**
   * Safaricom's test MSISDNs. Pushes to these are safe because no real
   * subscriber is behind them.
   */
  private static readonly SAFARICOM_TEST_MSISDNS = ['254708374149'];

  /**
   * Refuses to charge a real phone from a non-production Daraja app.
   *
   * The sandbox is not a simulation for the person holding the handset: an
   * STK push sent with sandbox credentials to a real Safaricom line debits
   * that line's actual M-Pesa balance, and the funds are paid to the shared
   * test shortcode 174379 ("Daraja-Sandbox"), which no developer controls and
   * cannot issue a refund from. Only Safaricom can reverse it.
   *
   * So outside production a push may only target a number someone has
   * explicitly declared as safe to charge. Testing against your own line stays
   * possible — it just has to be a deliberate act, not an accident.
   */
  private assertPhoneAllowedForSandbox(phone: string) {
    if ((this.configService.get<string>('MPESA_ENV') || 'sandbox') === 'production') return;

    const normalized = this.normalizePhone(phone);
    const declared = (this.configService.get<string>('MPESA_TEST_PHONES') || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => this.normalizePhone(p));

    if ([...MpesaService.SAFARICOM_TEST_MSISDNS, ...declared].includes(normalized)) return;

    throw new Error(
      `Refusing to send a sandbox STK push to ${normalized}: it is not a declared test number. ` +
        'Sandbox pushes debit REAL money from real Safaricom lines and pay it to shortcode 174379, ' +
        'which this project cannot refund. To charge this number anyway, add it to MPESA_TEST_PHONES ' +
        'in backend/.env — and expect the money to actually leave the account.',
    );
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
