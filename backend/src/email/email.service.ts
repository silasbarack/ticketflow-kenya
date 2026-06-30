import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resvg } from '@resvg/resvg-js';

export interface TicketEmailPayload {
  to: string;
  buyerName: string;
  eventName: string;
  ticketType: string;
  ticketCode: string;
  venue: string;
  eventDateTime: string;
  pdfBuffer: Buffer;
}

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e11d48"/><stop offset="1" stop-color="#881337"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#g)"/><rect x="9" y="15" width="30" height="18" rx="3" fill="white"/><circle cx="9" cy="24" r="3.5" fill="url(#g)"/><circle cx="39" cy="24" r="3.5" fill="url(#g)"/><line x1="30" y1="17.5" x2="30" y2="30.5" stroke="#fda4af" stroke-width="1.4" stroke-dasharray="2.2 2.2" stroke-linecap="round"/><path d="M32.2 24 L34.4 26.4 L37.6 21" fill="none" stroke="#881337" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private logoPngBase64 = '';

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10),
        secure: this.configService.get<string>('SMTP_PORT') === '465',
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  onModuleInit() {
    try {
      const resvg = new Resvg(LOGO_SVG, { fitTo: { mode: 'width', value: 96 } });
      this.logoPngBase64 = resvg.render().asPng().toString('base64');
      this.logger.log('Logo PNG rendered for email');
    } catch (err: any) {
      this.logger.warn(`Logo PNG render failed: ${err?.message}`);
    }
  }

  async sendTicketEmail(payload: TicketEmailPayload): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured — skipping ticket email for ' + payload.to);
      return false;
    }

    const from = this.configService.get<string>('SMTP_FROM') || 'tickets@ticketflow.co.ke';

    // Use pre-rendered PNG (converted from SVG on startup via Resvg/WASM).
    // PNG data URIs work in all email clients; SVG data URIs are blocked by Gmail.
    const logoBase64 = this.logoPngBase64;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- Header -->
        <tr>
          <td style="background:#be123c;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:14px;">
                  <img src="data:image/png;base64,${logoBase64}"
                       width="48" height="48" alt="TicketFlow Kenya Logo"
                       style="display:block;border-radius:10px;" />
                </td>
                <td style="vertical-align:middle;">
                  <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:bold;
                             line-height:1.2;">TicketFlow Kenya</h1>
                  <p style="color:#fda4af;margin:4px 0 0;font-size:13px;">Your ticket is ready</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="font-size:16px;color:#111827;margin:0 0 16px;">
              Dear <strong>${payload.buyerName}</strong>,
            </p>
            <p style="font-size:15px;color:#374151;margin:0 0 16px;">
              Thank you for purchasing your ticket through <strong>TicketFlow Kenya</strong>.
            </p>
            <p style="font-size:15px;color:#374151;margin:0 0 24px;">
              Your payment has been successfully confirmed, and your ticket for
              <strong>${payload.eventName}</strong> is attached to this email as a PDF.
            </p>

            <!-- Ticket Details Box -->
            <table width="100%" cellpadding="12" cellspacing="0"
                   style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 24px;">
              <tr>
                <td style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;
                           letter-spacing:0.05em;padding-bottom:8px;" colspan="2">
                  Ticket Details
                </td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#6b7280;width:140px;padding:4px 12px;">Event</td>
                <td style="font-size:14px;color:#111827;font-weight:600;padding:4px 12px;">
                  ${payload.eventName}
                </td>
              </tr>
              <tr style="background:#ffffff;">
                <td style="font-size:14px;color:#6b7280;padding:4px 12px;">Ticket Type</td>
                <td style="font-size:14px;color:#111827;font-weight:600;padding:4px 12px;">
                  ${payload.ticketType}
                </td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#6b7280;padding:4px 12px;">Ticket Code</td>
                <td style="font-size:14px;color:#111827;font-family:monospace;
                           font-weight:700;padding:4px 12px;">
                  ${payload.ticketCode}
                </td>
              </tr>
              <tr style="background:#ffffff;">
                <td style="font-size:14px;color:#6b7280;padding:4px 12px;">Venue</td>
                <td style="font-size:14px;color:#111827;font-weight:600;padding:4px 12px;">
                  ${payload.venue}
                </td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#6b7280;padding:4px 12px;">Date &amp; Time</td>
                <td style="font-size:14px;color:#111827;font-weight:600;padding:4px 12px;">
                  ${payload.eventDateTime}
                </td>
              </tr>
            </table>

            <p style="font-size:14px;color:#374151;margin:0 0 8px;">
              Please download and keep your ticket safely. You will be required to
              present the QR code at the entrance for verification.
            </p>
            <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">
              <strong>Important:</strong> This ticket is valid for one entry only.
              Do not share your QR code publicly.
            </p>

            <p style="font-size:15px;color:#374151;margin:0;">
              We appreciate your purchase and look forward to serving you again.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;
                     padding:16px 32px;text-align:center;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              Regards, <strong>TicketFlow Kenya</strong> &nbsp;·&nbsp;
              support@ticketflow.co.ke
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from,
        to: payload.to,
        subject: 'Your TicketFlow Kenya Ticket is Ready',
        html,
        attachments: [
          {
            filename: `ticket-${payload.ticketCode}.pdf`,
            content: payload.pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      this.logger.log(`Ticket email sent to ${payload.to} for ticket ${payload.ticketCode}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send ticket email to ${payload.to}: ${err?.message}`);
      return false;
    }
  }
}
