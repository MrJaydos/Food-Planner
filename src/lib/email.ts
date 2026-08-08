import { env } from "./env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

type Provider = "resend" | "smtp" | "console";

function activeProvider(): Provider {
  if (env.resendApiKey) return "resend";
  if (env.smtp.host) return "smtp";
  return "console";
}

async function sendViaResend(msg: EmailMessage): Promise<void> {
  // Lazy import so the SDK isn't loaded when unused.
  const { Resend } = await import("resend");
  const resend = new Resend(env.resendApiKey);
  const { error } = await resend.emails.send({
    from: env.emailFrom,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
  if (error) {
    throw new Error(`Resend error: ${error.message ?? String(error)}`);
  }
}

async function sendViaSmtp(msg: EmailMessage): Promise<void> {
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user
      ? { user: env.smtp.user, pass: env.smtp.password }
      : undefined,
  });
  await transport.sendMail({
    from: env.emailFrom,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
}

function logToConsole(msg: EmailMessage): void {
  // Dev fallback: print the message (and any links) so login works without a
  // configured email provider.
  console.log(
    [
      "",
      "──────────────────────────────────────────────────────────────",
      "📧  Email (no provider configured — logging instead)",
      `    To:      ${msg.to}`,
      `    Subject: ${msg.subject}`,
      "",
      msg.text,
      "──────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

/**
 * Send an email via the configured provider. Falls back to console logging when
 * neither Resend nor SMTP is configured (development convenience).
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const provider = activeProvider();
  try {
    if (provider === "resend") return await sendViaResend(msg);
    if (provider === "smtp") return await sendViaSmtp(msg);
    return logToConsole(msg);
  } catch (err) {
    // Never crash the request because email failed; log and, in dev, surface
    // the message so the user can still act on it.
    console.error(`[email] delivery via ${provider} failed:`, err);
    if (!env.isProduction) logToConsole(msg);
    throw err;
  }
}

export function isEmailConfigured(): boolean {
  return activeProvider() !== "console";
}
