import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const isSmtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS);

export const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: Number(env.SMTP_PORT) === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

export async function verifyMailer() {
  if (!isSmtpConfigured) return;
  try {
    await transporter.verify();
    logger.info('Mail ready');
  } catch (err) {
    logger.error({ err: err.message, code: err.code }, 'Mail verification failed');
  }
}

/**
 * Send an invite email with HTML body and plain-text fallback.
 */
export async function sendInviteEmail({ to, workspaceName, inviterName, role, inviteUrl }) {
  if (!transporter) throw new Error('SMTP not configured');

  const subject = `${inviterName} invited you to ${workspaceName}`;

  const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <p><strong>${inviterName}</strong> invited you to <strong>${workspaceName}</strong> as <strong>${role}</strong>.</p>
  <p style="margin:24px 0">
    <a href="${inviteUrl}"
       style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">
      Accept Invitation
    </a>
  </p>
  <p style="color:#666;font-size:13px">This link works once and expires in 48 hours.</p>
</div>`.trim();

  const text = [
    `${inviterName} invited you to ${workspaceName} as ${role}.`,
    '',
    `Accept your invite: ${inviteUrl}`,
    '',
    'This link works once and expires in 48 hours.',
  ].join('\n');

  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
    text,
  });
}
