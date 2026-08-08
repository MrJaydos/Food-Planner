"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrentContext } from "@/lib/context";

export function SettingsClient({ initial }: { initial: CurrentContext }) {
  const router = useRouter();
  const [name, setName] = useState(initial.user.name ?? "");
  const [householdName, setHouseholdName] = useState(initial.household.name);
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [invite, setInvite] = useState<{ url: string } | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch("/api/v1/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          householdName: householdName.trim(),
        }),
      });
      if (res.ok) {
        setSavedMsg("Saved");
        router.refresh();
      } else {
        setSavedMsg("Couldn't save");
      }
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(""), 2500);
    }
  }

  async function createInvite() {
    setInviteBusy(true);
    setCopied(false);
    try {
      const res = await fetch("/api/v1/households/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (res.ok) setInvite({ url: body.data.url });
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyInvite() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable; user can select the text */
    }
  }

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6 p-4">
      {/* Profile + household */}
      <form onSubmit={saveProfile} className="card space-y-4 p-5">
        <h2 className="font-semibold">Profile</h2>
        <div>
          <label className="label" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            className="input"
            value={name}
            placeholder="e.g. Alex"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input opacity-60"
            value={initial.user.email}
            disabled
          />
        </div>
        <div>
          <label className="label" htmlFor="household">
            Household name
          </label>
          <input
            id="household"
            className="input"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          {savedMsg ? (
            <span className="text-sm text-brand-600 dark:text-brand-300">
              {savedMsg}
            </span>
          ) : null}
        </div>
      </form>

      {/* Members */}
      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">Household members</h2>
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {initial.members.map((m) => (
            <li
              key={m.membershipId}
              className="flex items-center justify-between py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {m.name ?? m.email}
                  {m.isSelf ? (
                    <span className="ml-2 text-xs text-black/40 dark:text-white/40">
                      you
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-black/45 dark:text-white/45">
                  {m.email}
                </p>
              </div>
              <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-black/60 dark:bg-white/10 dark:text-white/60">
                {m.role === "OWNER" ? "Owner" : "Member"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Invite partner */}
      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">Invite a partner</h2>
        <p className="text-sm text-black/55 dark:text-white/55">
          Share this link so a partner can join and share all recipes, plans and
          lists. The link is valid for 7 days.
        </p>
        {invite ? (
          <div className="space-y-2">
            <div className="break-all rounded-xl bg-black/5 px-3 py-2 text-xs dark:bg-white/10">
              {invite.url}
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={copyInvite}>
                {copied ? "Copied!" : "Copy link"}
              </button>
              <button className="btn-secondary" onClick={createInvite}>
                New link
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn-primary"
            onClick={createInvite}
            disabled={inviteBusy}
          >
            {inviteBusy ? "Generating…" : "Create invite link"}
          </button>
        )}
      </div>

      {/* Danger / sign out */}
      <div className="card p-5">
        <button className="btn-secondary w-full" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
