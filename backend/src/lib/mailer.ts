import nodemailer from 'nodemailer';
import { env } from '../env.js';

const transporter =
  env.smtpHost && env.smtpUser && env.smtpPass
    ? nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: { user: env.smtpUser, pass: env.smtpPass },
      })
    : null;

/**
 * Envia e-mail. Sem SMTP configurado (SMTP_HOST/SMTP_USER/SMTP_PASS em
 * backend/.env), cai no modo simulado: o conteúdo aparece no log do
 * servidor, útil para testar o fluxo antes de ter um provedor de e-mail.
 */
export async function sendEmail(params: { to: string; subject: string; text: string }) {
  if (!transporter) {
    console.log(
      `✉️  [E-MAIL SIMULADO — SMTP não configurado] Para: ${params.to} | Assunto: ${params.subject}\n${params.text}`,
    );
    return;
  }

  await transporter.sendMail({
    from: env.smtpFrom,
    to: params.to,
    subject: params.subject,
    text: params.text,
  });
}
