#!/usr/bin/env node
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config({ path: process.env.DIVERGRAM_API_ENV_FILE || '/home/divergram/api/.env' });

const recipient = String(process.env.DIVERGRAM_ALERT_EMAIL || '').trim();
const subject = String(process.argv[2] || '[Divergram] Server alert').trim();
const message = String(process.argv[3] || 'Divergram server monitor generated an alert.').trim();
const smtpHost = String(process.env.SMTP_HOST || '').trim();
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = String(process.env.SMTP_USER || '').trim();
const smtpPass = String(process.env.SMTP_PASS || '').trim();

if (!recipient || !smtpHost || !smtpUser || !smtpPass) {
  throw new Error('health_alert_email_configuration_missing');
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: { user: smtpUser, pass: smtpPass },
});

await transporter.sendMail({
  from: process.env.SMTP_FROM || smtpUser,
  to: recipient,
  subject,
  text: message,
});

console.log('Health alert email sent');
