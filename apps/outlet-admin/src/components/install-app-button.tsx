import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { getRuntimeSurface } from "../lib/native-bridge";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (getRuntimeSurface() !== "browser") return undefined;

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (!installPrompt || dismissed) {
    return null;
  }

  async function handleInstall() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      setDismissed(true);
      setInstallPrompt(null);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleInstall()}
      className="ml-auto hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 text-xs font-bold text-[var(--rsc-panel)] transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rsc-brand-light)] sm:inline-flex"
    >
      <Download size={15} aria-hidden="true" />
      Install app
    </button>
  );
}
