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

export interface PasswordResetCodeEmailPayload {
  to: string;
  firstName: string;
  code: string;
  expiresInMinutes: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadLogoPng(): Buffer | null {
  try {
    return fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'logo.png'));
  } catch {
    return null;
  }
}

function emailFrame(logoSrc: string, title: string, intro: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f5f8;font-family:'Poppins','Noto Sans',Arial,sans-serif;color:#1b1d22">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 14px;background:#f4f5f8">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #eceef2;border-radius:18px;overflow:hidden">
        <tr>
          <td style="padding:20px 24px;background:#ffffff">
            <img src="${logoSrc}" width="190" alt="TicketFlow Kenya" style="display:block;width:190px;height:auto;max-width:100%;border:0">
          </td>
        </tr>
        <tr>
          <td style="padding:26px 24px 24px;background:#e6002d;background-image:linear-gradient(135deg,#ff2a52 0%,#e6002d 55%,#b00022 100%)">
            <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#ffd3dc;text-transform:uppercase">Good Events &middot; Brighter People</div>
            <h1 style="margin:8px 0 8px;font-size:28px;line-height:1.15;color:#ffffff">${title}</h1>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#ffe9ee">${intro}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 24px 30px">
            ${body}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #eceef2">
              <tr><td style="padding-top:18px;font-size:12px;line-height:1.7;color:#6b6f78">
                Events make a <strong style="color:#e6002d">brighter Kenya</strong>.<br>
                <strong style="color:#1b1d22">TicketFlow Kenya</strong> &middot;
                <a href="mailto:support@ticketflow.co.ke" style="color:#e6002d;text-decoration:none">support@ticketflow.co.ke</a>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0;font-size:11px;color:#9a9ea6">&copy; TicketFlow Kenya &middot; Nairobi, Kenya</p>
    </td></tr>
  </table>
</body>
</html>`;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly logoPng = loadLogoPng();

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

  private getLogoSrc() {
    if (this.logoPng) return 'cid:ticketflow-logo';
    return this.configService.get<string>('EMAIL_LOGO_URL')
      || 'https://ticketflow-frontend-w47s.onrender.com/brand/ticketflow-logo-horizontal.png';
  }

  private logoAttachment() {
    if (!this.logoPng) return [];
    return [{
      filename: 'ticketflow-logo.png',
      content: this.logoPng,
      contentType: 'image/png',
      cid: 'ticketflow-logo',
    }];
  }

  async sendTicketEmail(payload: TicketEmailPayload): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured — skipping ticket email for ' + payload.to);
      return false;
    }

    const buyer = escapeHtml(payload.buyerName);
    const event = escapeHtml(payload.eventName);
    const ticketType = escapeHtml(payload.ticketType);
    const ticketCode = escapeHtml(payload.ticketCode);
    const venue = escapeHtml(payload.venue);
    const eventDateTime = escapeHtml(payload.eventDateTime);

    const details = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e9ed;border-radius:12px;overflow:hidden">
        <tr><td colspan="2" style="padding:11px 14px;background:#fff4f6;color:#e6002d;font-size:11px;font-weight:800;letter-spacing:1px">YOUR E-TICKET</td></tr>
        <tr><td style="padding:11px 14px;color:#83878e;font-size:12px;width:120px;border-top:1px solid #eceef1">Event</td><td style="padding:11px 14px;font-size:13px;font-weight:700;border-top:1px solid #eceef1">${event}</td></tr>
        <tr><td style="padding:11px 14px;color:#83878e;font-size:12px;border-top:1px solid #eceef1">Ticket</td><td style="padding:11px 14px;font-size:13px;font-weight:700;border-top:1px solid #eceef1">${ticketType}</td></tr>
        <tr><td style="padding:11px 14px;color:#83878e;font-size:12px;border-top:1px solid #eceef1">Code</td><td style="padding:11px 14px;font-size:15px;font-weight:900;color:#e6002d;border-top:1px solid #eceef1;font-family:monospace">${ticketCode}</td></tr>
        <tr><td style="padding:11px 14px;color:#83878e;font-size:12px;border-top:1px solid #eceef1">Venue</td><td style="padding:11px 14px;font-size:13px;font-weight:700;border-top:1px solid #eceef1">${venue}</td></tr>
        <tr><td style="padding:11px 14px;color:#83878e;font-size:12px;border-top:1px solid #eceef1">Date</td><td style="padding:11px 14px;font-size:13px;font-weight:700;border-top:1px solid #eceef1">${eventDateTime}</td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#666b73">Your PDF ticket is attached. Keep the QR code private and present it at the entrance for verification.</p>
    `;

    const html = emailFrame(
      this.getLogoSrc(),
      'Your ticket is ready',
      `Hi ${buyer}, your payment is confirmed and your TicketFlow ticket is ready.`,
      details,
    );

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || 'tickets@ticketflow.co.ke',
        to: payload.to,
        subject: 'Your TicketFlow Kenya Ticket is Ready',
        html,
        attachments: [
          ...this.logoAttachment(),
          {
            filename: `ticket-${payload.ticketCode}.pdf`,
            content: payload.pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      this.logger.log(`Ticket email sent to ${payload.to} for ticket ${payload.ticketCode}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send ticket email: ${error?.message}`);
      return false;
    }
  }

  async sendPasswordResetCodeEmail(payload: PasswordResetCodeEmailPayload): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured — password reset code email not sent');
      return false;
    }

    const firstName = escapeHtml(payload.firstName || 'there');
    const code = escapeHtml(payload.code);

    const body = `
      <div style="padding:22px;border:1px solid #f0d5dc;border-radius:14px;background:#fff7f9;text-align:center">
        <div style="font-size:10px;font-weight:800;letter-spacing:2px;color:#8b8f96;text-transform:uppercase">Verification code</div>
        <div style="margin-top:10px;font-size:38px;font-weight:900;letter-spacing:10px;color:#e6002d;font-family:monospace">${code}</div>
      </div>
      <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#666b73">This code expires in <strong>${payload.expiresInMinutes} minutes</strong> and can only be used once. Never share it with anyone.</p>
    `;

    const html = emailFrame(
      this.getLogoSrc(),
      'Reset your password',
      `Hi ${firstName}, we received a request to reset your TicketFlow Kenya password.`,
      body,
    );

    const text = [
      `Hi ${payload.firstName || 'there'},`,
      '',
      `Your TicketFlow Kenya verification code is ${payload.code}.`,
      `It expires in ${payload.expiresInMinutes} minutes.`,
      '',
      'If you did not request this, ignore this email.',
      'TicketFlow Kenya · support@ticketflow.co.ke',
    ].join('\n');

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || 'tickets@ticketflow.co.ke',
        to: payload.to,
        subject: 'TicketFlow Kenya Password Reset Code',
        text,
        html,
        attachments: this.logoAttachment(),
      });
      this.logger.log('Password reset code email sent');
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send password reset code email: ${error?.message}`);
      return false;
    }
  }
}
