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

export interface PasswordResetEmailPayload {
  to: string;
  firstName: string;
  token: string;
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

    /*
     * Plain-text fallback:
     * Dear ${payload.buyerName},
     * Thank you for purchasing your ticket through TicketFlow Kenya.
     * Your payment has been successfully confirmed, and your ticket for ${payload.eventName} is attached as a PDF.
     * Ticket Code: ${payload.ticketCode} | Venue: ${payload.venue} | Date: ${payload.eventDateTime}
     * Please present the QR code at the entrance. Important: valid for one entry only.
     * We appreciate your purchase. Regards, TicketFlow Kenya — support@ticketflow.co.ke
     */
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Your TicketFlow Kenya Ticket</title>
</head>
<body style="margin:0;padding:0;background-color:#121212;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<!-- Outer wrapper: #121212 background, 32px 24px padding -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background-color:#121212;padding:32px 24px;">
<tr><td align="center">

<!-- Main card: max 600px, #1e1f21 background -->
<table role="presentation" cellpadding="0" cellspacing="0"
       style="width:100%;max-width:600px;background-color:#1e1f21;border-radius:8px;overflow:hidden;">

  <!-- ── Logo header ── -->
  <tr>
    <td style="background-color:#be123c;padding:16px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:14px;">
          <img src="${logoUrl}" width="56" height="58" alt="TFK" style="display:block;"/>
        </td>
        <td style="vertical-align:middle;">
          <div style="color:#ffffff;font-size:24px;font-weight:900;font-style:italic;line-height:1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">TICKETFLOW</div>
          <div style="color:#fda4af;font-size:10px;font-weight:700;letter-spacing:5px;margin-top:3px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">KENYA</div>
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- ── Body: 24px padding ── -->
  <tr>
    <td style="padding:28px 24px 24px;">

      <!-- 1. Greeting: 20px, #eaeeef -->
      <p style="margin:0 0 18px;font-size:20px;font-weight:600;color:#eaeeef;line-height:1.4;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        Dear <strong>${payload.buyerName}</strong>,
      </p>

      <!-- 2. Paragraph 1: 14px, dark blue #1a3a6e -->
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#1a3a6e;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        Thank you for purchasing your ticket through <strong>TicketFlow Kenya</strong>.
      </p>

      <!-- 3. Paragraph 2: separate block, same 14px dark blue, margin-top via margin -->
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#1a3a6e;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        Your payment has been successfully confirmed, and your ticket for
        <strong>${payload.eventName}</strong> is attached to this email as a PDF.
      </p>

      <!-- 4. Ticket details rounded card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="border-radius:12px;border:1px solid #2a2b2d;overflow:hidden;margin:0 0 24px;">

        <!-- Section header -->
        <tr>
          <td colspan="2" style="background-color:#1e1f21;padding:12px 16px;border-bottom:1px solid #2a2b2d;">
            <span style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9aa0a6;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">TICKET DETAILS</span>
          </td>
        </tr>

        <!-- Event (odd row: #121212) -->
        <tr style="background-color:#121212;">
          <td style="font-size:15px;color:#9aa0a6;padding:11px 16px;width:130px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Event</td>
          <td style="font-size:16px;color:#ffffff;font-weight:600;padding:11px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${payload.eventName}</td>
        </tr>

        <!-- Ticket Type (even row: #1e1f21) -->
        <tr style="background-color:#1e1f21;">
          <td style="font-size:15px;color:#9aa0a6;padding:11px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Ticket Type</td>
          <td style="font-size:16px;color:#ffffff;font-weight:600;padding:11px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${payload.ticketType}</td>
        </tr>

        <!-- Ticket Code (odd row: #121212) — coral #ff6b6b, monospace -->
        <tr style="background-color:#121212;">
          <td style="font-size:15px;color:#9aa0a6;padding:11px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Ticket Code</td>
          <td style="font-size:16px;color:#ff6b6b;font-weight:700;padding:11px 16px;font-family:'Courier New',Courier,monospace;">${payload.ticketCode}</td>
        </tr>

        <!-- Venue (even row: #1e1f21) -->
        <tr style="background-color:#1e1f21;">
          <td style="font-size:15px;color:#9aa0a6;padding:11px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Venue</td>
          <td style="font-size:16px;color:#ffffff;font-weight:600;padding:11px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${payload.venue}</td>
        </tr>

        <!-- Date & Time (odd row: #121212) -->
        <tr style="background-color:#121212;">
          <td style="font-size:15px;color:#9aa0a6;padding:11px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Date &amp; Time</td>
          <td style="font-size:16px;color:#ffffff;font-weight:600;padding:11px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${payload.eventDateTime}</td>
        </tr>

      </table>

      <!-- 5. Instructional paragraph: 14px dark blue -->
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#1a3a6e;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        Please download and keep your ticket safely. You will be required to present
        the QR code at the entrance for verification.
      </p>

      <!-- 6. Important notice — 12px (smaller than 14px body, per spec) -->
      <p style="margin:0 0 20px;font-size:12px;line-height:1.6;color:#9aa0a6;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <strong style="color:#eaeeef;">Important:</strong> This ticket is valid for one entry only.
        Do not share your QR code publicly.
      </p>

      <!-- 7. Closing paragraph: 14px dark blue -->
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#1a3a6e;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        We appreciate your purchase and look forward to serving you again.
      </p>

      <!-- 8. Horizontal divider -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr><td style="border-top:1px solid #2a2b2d;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>

      <!-- 9. Footer: 14px #9aa0a6, centered, email link #6ea8fe -->
      <p style="margin:0;font-size:14px;color:#9aa0a6;text-align:center;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        Regards, <strong style="color:#eaeeef;">TicketFlow Kenya</strong> &nbsp;&middot;&nbsp;
        <a href="mailto:support@ticketflow.co.ke"
           style="color:#6ea8fe;text-decoration:none;">support@ticketflow.co.ke</a>
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

  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured — skipping password reset email for ' + payload.to);
      return false;
    }

    const from = this.configService.get<string>('SMTP_FROM') || 'tickets@ticketflow.co.ke';

    // Same rationale as the ticket email logo: must be a publicly reachable URL.
    const logoUrl = this.configService.get<string>('EMAIL_LOGO_URL')
      || 'https://ticketflow-frontend-w47s.onrender.com/logo.png';

    const frontendUrl = this.configService.get<string>('FRONTEND_URL')
      || 'https://ticketflow-frontend-w47s.onrender.com';
    const resetUrl = `${frontendUrl}/reset-password?token=${payload.token}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Reset your TicketFlow Kenya password</title>
</head>
<body style="margin:0;padding:0;background-color:#121212;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background-color:#121212;padding:32px 24px;">
<tr><td align="center">

<table role="presentation" cellpadding="0" cellspacing="0"
       style="width:100%;max-width:600px;background-color:#1e1f21;border-radius:8px;overflow:hidden;">

  <tr>
    <td style="background-color:#be123c;padding:16px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:14px;">
          <img src="${logoUrl}" width="56" height="58" alt="TFK" style="display:block;"/>
        </td>
        <td style="vertical-align:middle;">
          <div style="color:#ffffff;font-size:24px;font-weight:900;font-style:italic;line-height:1;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">TICKETFLOW</div>
          <div style="color:#fda4af;font-size:10px;font-weight:700;letter-spacing:5px;margin-top:3px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">KENYA</div>
        </td>
      </tr></table>
    </td>
  </tr>

  <tr>
    <td style="padding:28px 24px 24px;">

      <p style="margin:0 0 18px;font-size:20px;font-weight:600;color:#eaeeef;line-height:1.4;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        Dear <strong>${payload.firstName}</strong>,
      </p>

      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#1a3a6e;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        We received a request to reset the password for your <strong>TicketFlow Kenya</strong> account.
        Click the button below to choose a new password. This link expires in 30 minutes.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="border-radius:8px;background-color:#be123c;">
            <a href="${resetUrl}"
               style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              Reset Password
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#9aa0a6;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${resetUrl}" style="color:#6ea8fe;word-break:break-all;">${resetUrl}</a>
      </p>

      <p style="margin:0 0 20px;font-size:12px;line-height:1.6;color:#9aa0a6;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <strong style="color:#eaeeef;">Didn't request this?</strong> You can safely ignore this email —
        your password will not be changed.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr><td style="border-top:1px solid #2a2b2d;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>

      <p style="margin:0;font-size:14px;color:#9aa0a6;text-align:center;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        Regards, <strong style="color:#eaeeef;">TicketFlow Kenya</strong> &nbsp;&middot;&nbsp;
        <a href="mailto:support@ticketflow.co.ke"
           style="color:#6ea8fe;text-decoration:none;">support@ticketflow.co.ke</a>
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
        subject: 'Reset your TicketFlow Kenya password',
        html,
      });
      this.logger.log(`Password reset email sent to ${payload.to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send password reset email to ${payload.to}: ${err?.message}`);
      return false;
    }
  }
}
