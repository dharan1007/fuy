import nodemailer from "nodemailer";

const from = process.env.EMAIL_FROM || "Fuy <no-reply@localhost>";
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

// cache across hot reloads
let _tx: nodemailer.Transporter | null = null;

function getTransporter() {
  if (_tx) return _tx;

  if (host && user && pass) {
    _tx = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,         // true only for 465
      auth: { user, pass },
    });
  } else {
    // Dev fallback: print emails to console if SMTP env is missing
    _tx = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }
  return _tx;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  const transporter = getTransporter();
  const { to, subject } = opts;

  const text = opts.text ?? "";
  const html =
    opts.html ??
    `<pre style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace">${escapeHtml(
      text
    )}</pre>`;

  const info = await transporter.sendMail({ from, to, subject, text, html });

  // echo if using dev stream transport
  // @ts-expect-error optional prop on purpose
  if (transporter.options?.streamTransport) {
    console.log("\n----- DEV EMAIL (no SMTP configured) -----");
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(text || "(no text body)");
    console.log("----- END DEV EMAIL -----\n");
  } else {
    console.log(`Email sent -> ${info.messageId || "(no id)"} to ${to}`);
  }

  return info;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c];
  });
}
