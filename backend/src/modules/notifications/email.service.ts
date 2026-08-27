import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    const port = parseInt(process.env.SMTP_PORT ?? '1025', 10);
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port,
      secure: port === 465,
      ...(process.env.SMTP_USER && process.env.SMTP_PASS
        ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
        : {}),
    });
  }

  async sendVerificationEmail(to: string, token: string, baseUrl: string): Promise<void> {
    const url = `${baseUrl}/account/verify-email?token=${token}`;
    this.logger.log(`Sending verification email to ${to} via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    await this.transporter.sendMail({
      from: '"Shinobi Store" <noreply@shinobistore.local>',
      to,
      subject: 'Verify your email \u2014 Shinobi Store',
      html: this.verificationTemplate(url),
    });
    this.logger.log(`Verification email sent to ${to}`);
  }

  async sendPasswordResetEmail(to: string, token: string, baseUrl: string): Promise<void> {
    const url = `${baseUrl}/account/reset-password?token=${token}`;
    await this.transporter.sendMail({
      from: '"Shinobi Store" <noreply@shinobistore.local>',
      to,
      subject: 'Reset your password \u2014 Shinobi Store',
      html: this.passwordResetTemplate(url),
    });
    this.logger.log(`Password reset email sent to ${to}`);
  }

  private verificationTemplate(url: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0A0A12;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A12;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#12121F;border-radius:12px;border:1px solid #1E1E32;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;">
              <h1 style="margin:0;font-size:24px;color:#F0F0F0;letter-spacing:3px;font-weight:700;">SHINOBI STORE</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 30px;text-align:center;">
              <div style="width:60px;height:3px;background:linear-gradient(90deg,#FF6B00,#FF8C40);margin:0 auto 30px;border-radius:2px;"></div>
              <h2 style="margin:0 0 16px;font-size:20px;color:#F0F0F0;font-weight:600;">VERIFY YOUR EMAIL</h2>
              <p style="margin:0 0 30px;font-size:15px;color:#B8B8CC;line-height:1.6;">
                Welcome to the ranks. Click below to verify your email address and activate your account.
              </p>
              <a href="${url}" style="display:inline-block;padding:14px 48px;background:linear-gradient(135deg,#FF6B00,#E05500);color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:2px;border-radius:8px;text-transform:uppercase;">
                VERIFY EMAIL
              </a>
              <p style="margin:30px 0 0;font-size:13px;color:#6B6B80;line-height:1.5;">
                This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1E1E32;text-align:center;">
              <p style="margin:0;font-size:12px;color:#4A4A60;">&copy; ${new Date().getFullYear()} Shinobi Store. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private passwordResetTemplate(url: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0A0A12;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A12;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#12121F;border-radius:12px;border:1px solid #1E1E32;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;">
              <h1 style="margin:0;font-size:24px;color:#F0F0F0;letter-spacing:3px;font-weight:700;">SHINOBI STORE</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 30px;text-align:center;">
              <div style="width:60px;height:3px;background:linear-gradient(90deg,#FF6B00,#FF8C40);margin:0 auto 30px;border-radius:2px;"></div>
              <h2 style="margin:0 0 16px;font-size:20px;color:#F0F0F0;font-weight:600;">RESET YOUR PASSWORD</h2>
              <p style="margin:0 0 30px;font-size:15px;color:#B8B8CC;line-height:1.6;">
                We received a request to reset your password. Click below to set a new one.
              </p>
              <a href="${url}" style="display:inline-block;padding:14px 48px;background:linear-gradient(135deg,#FF6B00,#E05500);color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:2px;border-radius:8px;text-transform:uppercase;">
                RESET PASSWORD
              </a>
              <p style="margin:30px 0 0;font-size:13px;color:#6B6B80;line-height:1.5;">
                This link expires in 30 minutes and can only be used once. If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1E1E32;text-align:center;">
              <p style="margin:0;font-size:12px;color:#4A4A60;">&copy; ${new Date().getFullYear()} Shinobi Store. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
