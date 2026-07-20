import "server-only";

import { Resend } from "resend";

type EmailKind = "email_verification" | "password_reset";

type EmailConfig = {
  apiKey: string;
  from: string;
  appUrl: string;
};

export class EmailServiceError extends Error {
  constructor(
    message: string,
    readonly reason: "configuration" | "delivery",
  ) {
    super(message);
    this.name = "EmailServiceError";
  }
}

function getEmailConfig(): EmailConfig {
  const values = {
    RESEND_API_KEY: process.env.RESEND_API_KEY?.trim(),
    EMAIL_FROM: process.env.EMAIL_FROM?.trim(),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL?.trim(),
  };
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    console.error("Email configuration is incomplete.", { missing });
    throw new EmailServiceError(
      `Missing required email configuration: ${missing.join(", ")}`,
      "configuration",
    );
  }

  let appUrl: URL;
  try {
    appUrl = new URL(values.NEXT_PUBLIC_APP_URL!);
  } catch {
    console.error("Email configuration has an invalid NEXT_PUBLIC_APP_URL.");
    throw new EmailServiceError("NEXT_PUBLIC_APP_URL must be a valid URL.", "configuration");
  }

  if (!['http:', 'https:'].includes(appUrl.protocol)) {
    console.error("Email configuration has an unsupported NEXT_PUBLIC_APP_URL protocol.");
    throw new EmailServiceError("NEXT_PUBLIC_APP_URL must use HTTP or HTTPS.", "configuration");
  }

  if (process.env.NODE_ENV === "production" && values.EMAIL_FROM!.toLowerCase().includes("onboarding@resend.dev")) {
    console.error("The Resend testing sender cannot be used in production.");
    throw new EmailServiceError("EMAIL_FROM must use a verified production domain.", "configuration");
  }

  return {
    apiKey: values.RESEND_API_KEY!,
    from: values.EMAIL_FROM!,
    appUrl: appUrl.toString().replace(/\/$/, ""),
  };
}

function recipientDomain(email: string): string {
  return email.split("@").at(-1) || "unknown";
}

function safeProviderError(error: unknown): { name: string; message: string; statusCode?: number } {
  if (!error || typeof error !== "object") {
    return { name: "UnknownProviderError", message: "Unknown email provider error" };
  }

  const providerError = error as { name?: unknown; message?: unknown; statusCode?: unknown };
  return {
    name: typeof providerError.name === "string" ? providerError.name : "ProviderError",
    message: typeof providerError.message === "string" ? providerError.message : "Email provider rejected the request",
    ...(typeof providerError.statusCode === "number" ? { statusCode: providerError.statusCode } : {}),
  };
}

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: EmailKind;
}): Promise<void> {
  const config = getEmailConfig();
  const resend = new Resend(config.apiKey);

  let response: Awaited<ReturnType<typeof resend.emails.send>>;
  try {
    response = await resend.emails.send({
      from: config.from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  } catch (error) {
    console.error("Email delivery request failed.", {
      provider: "resend",
      kind: options.kind,
      recipientDomain: recipientDomain(options.to),
      error: safeProviderError(error),
    });
    throw new EmailServiceError("The email provider could not be reached.", "delivery");
  }

  const { data, error } = response;
  if (error || !data?.id) {
    console.error("Email delivery was rejected.", {
      provider: "resend",
      kind: options.kind,
      recipientDomain: recipientDomain(options.to),
      error: safeProviderError(error),
    });
    throw new EmailServiceError("The email provider rejected the message.", "delivery");
  }

  console.info("Email accepted for delivery.", {
    provider: "resend",
    kind: options.kind,
    recipientDomain: recipientDomain(options.to),
    messageId: data.id,
  });
}

function emailShell(options: { eyebrow: string; title: string; body: string; actionLabel: string; actionUrl: string; footer: string }): string {
  const safeActionUrl = options.actionUrl.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f3ff;color:#18181b;font-family:Arial,sans-serif;padding:32px 16px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden">
      <div style="padding:28px 32px 18px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff">
        <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.9">${options.eyebrow}</div>
        <h1 style="font-size:26px;line-height:1.25;margin:10px 0 0">${options.title}</h1>
      </div>
      <div style="padding:30px 32px">
        <p style="font-size:16px;line-height:1.65;margin:0;color:#3f3f46">${options.body}</p>
        <div style="margin:28px 0">
          <a href="${safeActionUrl}" style="display:inline-block;background:#5b3fd3;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 22px;border-radius:9px">${options.actionLabel}</a>
        </div>
        <p style="font-size:13px;line-height:1.55;color:#71717a;margin:0">${options.footer}</p>
        <p style="font-size:12px;line-height:1.5;color:#a1a1aa;margin:22px 0 0;word-break:break-all">If the button does not work, copy this link:<br>${safeActionUrl}</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const { appUrl } = getEmailConfig();
  const verifyUrl = `${appUrl}/api/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  await sendEmail({
    to: email,
    subject: "Verify your Vexa email",
    kind: "email_verification",
    html: emailShell({
      eyebrow: "Vexa",
      title: "Verify your email address",
      body: "Welcome to Vexa. Confirm your email address to finish setting up your account and access your learning workspace.",
      actionLabel: "Verify email",
      actionUrl: verifyUrl,
      footer: "This one-time link expires in 24 hours. If you did not create a Vexa account, you can ignore this email.",
    }),
    text: `Verify your Vexa email\n\nOpen this one-time link to verify your email address:\n${verifyUrl}\n\nThis link expires in 24 hours. If you did not create a Vexa account, you can ignore this email.`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const { appUrl } = getEmailConfig();
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  await sendEmail({
    to: email,
    subject: "Reset your Vexa password",
    kind: "password_reset",
    html: emailShell({
      eyebrow: "Vexa security",
      title: "Reset your password",
      body: "We received a request to reset your Vexa password. Use the secure link below to choose a new password.",
      actionLabel: "Reset password",
      actionUrl: resetUrl,
      footer: "This one-time link expires in one hour. If you did not request a password reset, you can safely ignore this email.",
    }),
    text: `Reset your Vexa password\n\nOpen this one-time link to choose a new password:\n${resetUrl}\n\nThis link expires in one hour. If you did not request a password reset, you can ignore this email.`,
  });
}
