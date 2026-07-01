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

    // Logo must use the publicly deployed URL — localhost is unreachable from Gmail's servers.
    // EMAIL_LOGO_URL env var overrides; falls back to the known Render deployment.
    const logoUrl = this.configService.get<string>('EMAIL_LOGO_URL')
      || 'https://ticketflow-frontend-w47s.onrender.com/logo.png';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:12px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
       style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">

  <tr>
    <td style="background:#be123c;padding:14px 20px;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:12px;">
          <img src="${logoUrl}" width="56" height="58" alt="TFK" style="display:block;"/>
        </td>
        <td style="vertical-align:middle;">
          <div style="color:#fff;font-size:22px;font-weight:900;font-style:italic;line-height:1;">TICKETFLOW</div>
          <div style="color:#fda4af;font-size:10px;font-weight:700;letter-spacing:5px;margin-top:2px;">KENYA</div>
        </td>
      </tr></table>
    </td>
  </tr>

  <tr>
    <td style="padding:16px 20px 14px;">

      <p style="font-size:15px;color:#111827;margin:0 0 12px;line-height:1.5;">Dear <strong>${payload.buyerName}</strong>,</p>

      <p style="font-size:14px;color:#111827;margin:0 0 12px;line-height:1.5;">
        Thank you for purchasing your ticket through <strong>TicketFlow Kenya</strong>.
      </p>

      <p style="font-size:14px;color:#111827;margin:0 0 16px;line-height:1.5;">
        Your payment has been successfully confirmed, and your ticket for
        <strong>${payload.eventName}</strong> is attached to this email as a PDF.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin:0 0 14px;">
        <tr>
          <td colspan="2"
              style="background:#374151;padding:8px 14px;font-size:11px;font-weight:700;
                     color:#ffffff;text-transform:uppercase;letter-spacing:1.5px;">
            Ticket Details
          </td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="font-size:13px;color:#6b7280;padding:8px 14px;width:110px;">Event</td>
          <td style="font-size:13px;color:#111827;padding:8px 14px;font-weight:600;">${payload.eventName}</td>
        </tr>
        <tr style="background:#ffffff;">
          <td style="font-size:13px;color:#6b7280;padding:8px 14px;">Ticket Type</td>
          <td style="font-size:13px;color:#111827;padding:8px 14px;font-weight:600;">${payload.ticketType}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="font-size:13px;color:#6b7280;padding:8px 14px;">Ticket Code</td>
          <td style="font-size:13px;color:#be123c;padding:8px 14px;font-weight:700;font-family:Courier New,monospace;">${payload.ticketCode}</td>
        </tr>
        <tr style="background:#ffffff;">
          <td style="font-size:13px;color:#6b7280;padding:8px 14px;">Venue</td>
          <td style="font-size:13px;color:#111827;padding:8px 14px;font-weight:600;">${payload.venue}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="font-size:13px;color:#6b7280;padding:8px 14px;">Date &amp; Time</td>
          <td style="font-size:13px;color:#111827;padding:8px 14px;font-weight:600;">${payload.eventDateTime}</td>
        </tr>
      </table>

      <p style="font-size:14px;color:#111827;margin:0 0 10px;line-height:1.5;">
        Please download and keep your ticket safely. You will be required to present
        the QR code at the entrance for verification.
      </p>

      <p style="font-size:14px;color:#111827;margin:0 0 16px;line-height:1.5;">
        <strong>Important:</strong> This ticket is valid for one entry only.
        Do not share your QR code publicly.
      </p>

      <p style="font-size:14px;color:#111827;margin:0;line-height:1.5;">
        We appreciate your purchase and look forward to serving you again.
      </p>

    </td>
  </tr>

  <tr>
    <td style="border-top:1px solid #e0e0e0;padding:8px 18px;text-align:center;">
      <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.4;">
        Regards, <strong>TicketFlow Kenya</strong> &nbsp;&middot;&nbsp; support@ticketflow.co.ke
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body></html>`;

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
