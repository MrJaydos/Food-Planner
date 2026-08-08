// Centralised, validated access to environment configuration.
// Kept dependency-light so it can run in any runtime (route handlers, scripts).

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    // In production a missing critical var should be loud; in dev we soften it
    // so `next dev` can boot and show a helpful error page instead of crashing.
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return "";
  }
  return value;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get authSecret() {
    return required("AUTH_SECRET", "dev-insecure-secret-change-me");
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? "Food Planner <noreply@example.com>";
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY ?? "";
  },
  get smtp() {
    return {
      host: process.env.SMTP_HOST ?? "",
      port: Number(process.env.SMTP_PORT ?? "587"),
      user: process.env.SMTP_USER ?? "",
      password: process.env.SMTP_PASSWORD ?? "",
      secure: (process.env.SMTP_SECURE ?? "false") === "true",
    };
  },
  get uploadDir() {
    return process.env.UPLOAD_DIR ?? "./uploads";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};

export type Env = typeof env;
