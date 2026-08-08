"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "fp_install_hint_dismissed";

export function InstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Already installed?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS doesn't fire beforeinstallprompt — show a manual hint.
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      setIosHint(true);
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-16 z-40 mx-auto max-w-2xl px-4">
      <div className="card flex items-center gap-3 p-3 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install Food Planner</p>
          <p className="text-xs text-black/55 dark:text-white/55">
            {iosHint
              ? "Tap Share, then “Add to Home Screen”."
              : "Add it to your home screen for quick access & offline lists."}
          </p>
        </div>
        {!iosHint ? (
          <button onClick={install} className="btn-primary !px-3 !py-1.5 text-sm">
            Install
          </button>
        ) : null}
        <button onClick={dismiss} className="btn-ghost !px-2" aria-label="Dismiss">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
