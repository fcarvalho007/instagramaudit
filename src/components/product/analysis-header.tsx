import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { formatFollowers } from "@/lib/mock-analysis";

interface AnalysisHeaderProps {
  username: string;
  displayName: string;
  followers: number;
  avatarUrl?: string | null;
  isVerified?: boolean;
  bio?: string | null;
}

function hashHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function AnalysisHeader({
  username,
  displayName,
  followers,
  avatarUrl,
  isVerified = false,
  bio,
}: AnalysisHeaderProps) {
  // React-idiomatic fallback: track image load failure in state instead of
  // mutating the DOM via onError. Avoids inline display styles + sibling
  // traversal, and resets cleanly when avatarUrl changes.
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !imgFailed;

  const hue = hashHue(username);
  const gradient = `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 60) % 360}, 75%, 45%))`;

  return (
    <header className="flex flex-col gap-6 border-b border-border-subtle pb-8 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4 md:gap-5 min-w-0">
        {showImage ? (
          <img
            src={avatarUrl as string}
            alt={`Avatar de @${username}`}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="size-16 md:size-20 shrink-0 rounded-full ring-1 ring-border-default object-cover bg-surface-elevated"
          />
        ) : (
          <div
            className="size-16 md:size-20 shrink-0 rounded-full ring-1 ring-border-default"
            style={{ background: gradient }}
            aria-hidden="true"
          />
        )}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-eyebrow-sm text-[0.625rem] text-content-tertiary">
            Análise pública
          </span>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-content-primary tracking-tight truncate">
            {displayName}
            {isVerified ? (
              <span
                className="text-eyebrow-sm ml-2 inline-block align-middle text-[0.5625rem] text-accent-luminous"
                aria-label="Conta verificada"
              >
                · Verificada
              </span>
            ) : null}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-sm text-content-secondary">
            <span className="font-sans text-content-secondary">@{username}</span>
            <span aria-hidden="true" className="text-content-tertiary">
              ·
            </span>
            <span>
              <span className="font-mono text-content-primary">
                {formatFollowers(followers)}
              </span>{" "}
              seguidores
            </span>
          </div>
          {bio ? (
            <p className="mt-1 font-sans text-sm text-content-tertiary line-clamp-2 max-w-xl">
              {bio}
            </p>
          ) : null}
        </div>
      </div>

      <div className="md:shrink-0">
        <Badge variant="success" size="md" dot pulse>
          Dados em direto
        </Badge>
      </div>
    </header>
  );
}
