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

    // Logo served from the deployed frontend URL — avoids base64 bloat that
    // causes Gmail to clip the email at ~102 KB and hide the body message.
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://ticketflow-frontend-w47s.onrender.com';
    const logoUrl = `${frontendUrl}/logo.png`;

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
          <td style="background:#be123c;padding:20px 28px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:16px;">
                  <img src="${logoUrl}" width="72" height="75"
                       alt="TicketFlow Kenya Logo"
                       style="display:block;border-radius:8px;" />
                </td>
                <td style="vertical-align:middle;">
                  <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:900;
                             font-style:italic;line-height:1.1;letter-spacing:-0.5px;">
                    TICKETFLOW</h1>
                  <p style="color:#fda4af;margin:3px 0 0;font-size:12px;font-weight:700;
                            letter-spacing:5px;">KENYA</p>
                  <p style="color:#fecdd3;margin:8px 0 0;font-size:11px;">
                    Your ticket is ready &#8594;</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 24px;">

            <!-- Greeting -->
            <p style="font-size:17px;color:#111827;margin:0 0 6px;font-weight:600;">
              Dear ${payload.buyerName},
            </p>

            <!-- Appreciation message -->
            <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px;">
              Thank you so much for purchasing your ticket through
              <strong style="color:#be123c;">TicketFlow Kenya</strong>.
              We truly appreciate your trust in our platform and we are thrilled
              to have you join us for this event.
            </p>
            <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
              Your payment has been <strong>successfully confirmed</strong>, and your
              ticket for <strong>${payload.eventName}</strong> is attached to this
              email as a PDF. Please open the attachment, download it, and keep it
              safely — you will need to present the QR code at the entrance.
            </p>

            <!-- Ticket Details Box -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:2px solid #be123c;border-radius:10px;overflow:hidden;margin:0 0 24px;">
              <tr>
                <td colspan="2"
                    style="background:#be123c;padding:10px 16px;font-size:12px;
                           font-weight:700;color:#ffffff;text-transform:uppercase;
                           letter-spacing:1px;">
                  Your Ticket Details
                </td>
              </tr>
              <tr style="background:#fff1f2;">
                <td style="font-size:13px;color:#6b7280;padding:10px 16px;width:130px;
                           font-weight:600;">Event</td>
                <td style="font-size:14px;color:#111827;padding:10px 16px;font-weight:700;">
                  ${payload.eventName}
                </td>
              </tr>
              <tr style="background:#ffffff;">
                <td style="font-size:13px;color:#6b7280;padding:10px 16px;font-weight:600;">
                  Ticket Type</td>
                <td style="font-size:14px;color:#111827;padding:10px 16px;font-weight:700;">
                  ${payload.ticketType}
                </td>
              </tr>
              <tr style="background:#fff1f2;">
                <td style="font-size:13px;color:#6b7280;padding:10px 16px;font-weight:600;">
                  Ticket Code</td>
                <td style="font-size:14px;color:#be123c;padding:10px 16px;font-weight:700;
                           font-family:Courier New,monospace;letter-spacing:1px;">
                  ${payload.ticketCode}
                </td>
              </tr>
              <tr style="background:#ffffff;">
                <td style="font-size:13px;color:#6b7280;padding:10px 16px;font-weight:600;">
                  Venue</td>
                <td style="font-size:14px;color:#111827;padding:10px 16px;font-weight:700;">
                  ${payload.venue}
                </td>
              </tr>
              <tr style="background:#fff1f2;">
                <td style="font-size:13px;color:#6b7280;padding:10px 16px;font-weight:600;">
                  Date &amp; Time</td>
                <td style="font-size:14px;color:#111827;padding:10px 16px;font-weight:700;">
                  ${payload.eventDateTime}
                </td>
              </tr>
              <tr style="background:#ffffff;">
                <td style="font-size:13px;color:#6b7280;padding:10px 16px;font-weight:600;">
                  Payment</td>
                <td style="font-size:14px;color:#15803d;padding:10px 16px;font-weight:700;">
                  &#10003; Confirmed
                </td>
              </tr>
            </table>

            <!-- PDF note -->
            <table width="100%" cellpadding="12" cellspacing="0"
                   style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
                          margin:0 0 24px;">
              <tr>
                <td style="font-size:14px;color:#166534;line-height:1.6;">
                  <strong>&#128196; Your PDF ticket is attached to this email.</strong><br/>
                  Open the attachment to view or print your ticket. Present the
                  QR code at the event entrance for a quick and smooth check-in.
                </td>
              </tr>
            </table>

            <!-- Important notice -->
            <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 24px;
                      padding:12px 14px;background:#fef2f2;border-radius:6px;
                      border-left:3px solid #be123c;">
              <strong style="color:#be123c;">Important:</strong>
              This ticket is valid for <strong>one entry only</strong>.
              Do not share your QR code publicly — anyone holding a valid unused
              code may gain entry on your behalf.
            </p>

            <!-- Closing appreciation -->
            <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 8px;">
              We wish you a wonderful time at <strong>${payload.eventName}</strong>.
              Thank you again for choosing TicketFlow Kenya — your support means the
              world to us, and we look forward to serving you at many more events
              in the future!
            </p>
            <p style="font-size:15px;color:#374151;margin:0 0 4px;">
              Warm regards,
            </p>
            <p style="font-size:15px;font-weight:700;color:#be123c;margin:0;">
              The TicketFlow Kenya Team
            </p>

          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;
                     padding:16px 32px;text-align:center;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              <strong>TicketFlow Kenya</strong> &nbsp;·&nbsp;
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
