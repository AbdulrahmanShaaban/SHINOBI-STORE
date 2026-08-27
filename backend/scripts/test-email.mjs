// Quick SMTP test: node scripts/test-email.mjs <recipient>
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import nodemailer from 'nodemailer';

// Load .env manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: node scripts/test-email.mjs <recipient@email.com>');
    process.exit(1);
  }

  console.log(`Testing SMTP connection to ${process.env.SMTP_HOST}...`);
  try {
    await transporter.verify();
    console.log('✓ SMTP connection OK');

    const info = await transporter.sendMail({
      from: '"Shinobi Store" <noreply@shinobistore.local>',
      to,
      subject: 'Test Email — Shinobi Store',
      html: '<h1>It works!</h1><p>If you see this, email sending is configured correctly.</p>',
    });
    console.log(`✓ Email sent: ${info.messageId}`);
    console.log(`  Preview: ${nodemailer.getTestMessageUrl(info) ?? '(check your inbox)'}`);
  } catch (err) {
    console.error('✗ SMTP error:', err.message);
    if (err.code) console.error('  Code:', err.code);
    process.exit(1);
  }
}

main();
