"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "rk-install-banner-dismissed";

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari() {
  if (typeof window === "undefined") {
    return false;
  }
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);
  return isIOS && isSafari;
}

export function PwaInstallBanner() {
  const iosInstallHint = useMemo(() => isIosSafari() && !isStandaloneMode(), []);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    return !dismissed && iosInstallHint;
  });


  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    if (dismissed) {
      return;
    }

    if (isStandaloneMode()) {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, [iosInstallHint]);

  if (!visible) {
    return null;
  }

  async function installApp() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
  }

  function closeBanner() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-lg border border-border bg-card/95 p-3 text-sm shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <Image src="/rk.png" alt="RK Logo" width={40} height={40} className="h-10 w-10 rounded-md object-cover" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-card-foreground">Trainerportal als App installieren</p>
          {iosInstallHint ? (
            <p className="text-muted-foreground">Safari: Teilen → Zum Home-Bildschirm.</p>
          ) : (
            <p className="text-muted-foreground">Für schnelleren Zugriff zum Home-Bildschirm hinzufügen.</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={closeBanner} className="rounded-md border border-border px-3 py-1.5 hover:bg-accent/50">
          Später
        </button>
        {!iosInstallHint ? (
          <button
            type="button"
            onClick={installApp}
            className="rounded-md bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-600"
          >
            Installieren
          </button>
        ) : null}
      </div>
    </div>
  );
}
