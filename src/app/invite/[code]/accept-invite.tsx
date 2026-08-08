"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInvite({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/v1/households/invites/${encodeURIComponent(code)}/accept`,
        { method: "POST" },
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? "Couldn't accept this invite.");
        setBusy(false);
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <button className="btn-primary w-full" onClick={accept} disabled={busy}>
        {busy ? "Joining…" : "Join household"}
      </button>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
