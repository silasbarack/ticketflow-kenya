import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

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

// Load the full Kenya-map + card logo PNG from disk (assets/logo.png)
function loadLogoPng(): string {
  try {
    const logoPath = path.join(__dirname, '..', '..', 'assets', 'logo.png');
    return fs.readFileSync(logoPath).toString('base64');
  } catch {
    return '';
  }
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly logoPngBase64 = loadLogoPng();

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
    if (this.logoPngBase64) {
      this.logger.log('Logo PNG loaded for email');
    } else {
      this.logger.warn('assets/logo.png not found — email will show text logo');
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
                <td style="vertical-align:middle;padding-right:18px;">
                  <img src="data:image/png;base64,${logoBase64}"
                       width="110" height="115" alt="TicketFlow Kenya"
                       style="display:block;" />
                </td>
                <td style="vertical-align:middle;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:900;
                             font-style:italic;line-height:1.2;letter-spacing:-0.5px;">
                    TICKETFLOW</h1>
                  <p style="color:#fda4af;margin:2px 0 0;font-size:13px;font-weight:700;
                            letter-spacing:4px;">KENYA</p>
                  <p style="color:#fecdd3;margin:6px 0 0;font-size:12px;">
                    Your ticket is ready</p>
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
