// src/lib/mailer.ts
// src/lib/mailer.ts
import nodemailer from "nodemailer";


type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

const DEFAULT_FROM = process.env.MAIL_FROM || "no-reply@fuy.dev";

/**
 * Creates a singleton transporter from env.
 * Supported env:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE ("true"/"false"), SMTP_USER, SMTP_PASS
 */
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false") === "true";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  if (!host) {
    // Developer-friendly error: point to docs and keep behavior explicit
    throw new Error(
      "SMTP_HOST is not set. Configure SMTP env vars to enable real emails.\n" +
        "Required: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM"
    );
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  return _transporter;
}

/** Send a real email via SMTP. Throws on failure. */
export async function sendMail({ to, subject, html, text, from }: MailInput): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: from || DEFAULT_FROM,
    to,
    subject,
    text,
    html,
  });
}
