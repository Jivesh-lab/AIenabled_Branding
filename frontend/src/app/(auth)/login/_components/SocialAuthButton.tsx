/**
 * SocialAuthButton
 * A single social provider authentication button.
 *
 * TODO: Wire up real OAuth during the backend/auth integration phase.
 * Until then, clicking logs a console note and does nothing.
 */

"use client";

import { cn } from "@/lib/utils";
import GoogleIcon from "@/components/icons/GoogleIcon";
import GitHubIcon from "@/components/icons/GitHubIcon";
import FacebookIcon from "@/components/icons/FacebookIcon";

export type SocialProvider = "google" | "github" | "facebook";

interface SocialProviderConfig {
  label: string;
  icon: React.ReactNode;
}

const PROVIDER_CONFIG: Record<SocialProvider, SocialProviderConfig> = {
  google: {
    label: "Continue with Google",
    icon: <GoogleIcon />,
  },
  github: {
    label: "Continue with GitHub",
    icon: <GitHubIcon />,
  },
  facebook: {
    label: "Continue with Facebook",
    icon: <FacebookIcon />,
  },
};

// Placeholder — replace with real OAuth call during backend integration.
function handleSocialAuth(provider: SocialProvider): void {
  console.info(
    `[AAI-DBITIC] Social auth for "${provider}" is not yet configured. ` +
      `This will be connected during the OAuth/backend integration phase.`
  );
}

interface SocialAuthButtonProps {
  provider: SocialProvider;
}

export default function SocialAuthButton({ provider }: SocialAuthButtonProps) {
  const { label, icon } = PROVIDER_CONFIG[provider];

  return (
    <button
      type="button"
      onClick={() => handleSocialAuth(provider)}
      aria-label={label}
      className={cn(
        "flex flex-1 items-center justify-center gap-2",
        "rounded-md border border-slate-200 bg-white",
        "px-3 py-2 text-sm font-medium text-slate-700",
        "transition-colors duration-150",
        "hover:bg-slate-50 hover:border-slate-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40",
        "disabled:pointer-events-none disabled:opacity-50"
      )}
    >
      {icon}
      {/* Show provider name on sm+ screens; icon-only on mobile */}
      <span className="hidden sm:inline">
        {label.replace("Continue with ", "")}
      </span>
    </button>
  );
}
