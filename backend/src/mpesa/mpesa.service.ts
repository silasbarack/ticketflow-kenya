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
      AccountReference: params.accountReference,
      TransactionDesc: params.transactionDesc,
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

  /** Normalizes 07xxxxxxxx / +254xxxxxxxxx / 254xxxxxxxxx to 254xxxxxxxxx. */
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
