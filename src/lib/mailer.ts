import { Resend } from "resend";

const from = process.env.EMAIL_FROM || "Fuy <onboarding@resend.dev>";
const resendApiKey = process.env.RESEND_API_KEY;

// cache across hot reloads
let _resend: Resend | null = null;

function getResend() {
  if (_resend) return _resend;

  if (resendApiKey) {
    _resend = new Resend(resendApiKey);
  }

  return _resend;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  const resend = getResend();
  const { to, subject } = opts;

  const text = opts.text ?? "";
  const html =
    opts.html ??
    `<pre style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace">${escapeHtml(
      text
    )}</pre>`;

  // If no Resend API key, just log to console (dev mode)
  if (!resend) {
    console.log("\n----- DEV EMAIL (no RESEND_API_KEY configured) -----");
    console.log(`FROM: ${from}`);
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(text || "(no text body)");
    console.log("----- END DEV EMAIL -----\n");
    return { id: "dev-mode-no-send" };
  }

  // Send via Resend
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    text,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log(`Email sent via Resend -> ${data?.id} to ${to}`);
  return data;
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
