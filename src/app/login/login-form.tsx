"use client";

import { useState } from "react";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setDevLink(null);
    try {
      const res = await fetch("/api/v1/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, redirect: redirectTo }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(body?.error?.message ?? "Something went wrong.");
        return;
      }
      setStatus("sent");
      setMessage(body.data.message);
      setDevLink(body.data.devLink ?? null);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-900/40 dark:text-brand-100">
          {message}
        </div>
        {devLink ? (
          <a href={devLink} className="btn-primary w-full">
            Dev sign-in (link not emailed)
          </a>
        ) : null}
        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => {
            setStatus("idle");
            setMessage("");
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {status === "error" ? (
        <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      ) : null}
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
}
