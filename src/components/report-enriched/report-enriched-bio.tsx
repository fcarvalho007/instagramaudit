import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { ENRICHED_COPY } from "./report-enriched-copy";

interface Props {
  enriched: ReportEnriched;
  username: string;
}

/**
 * Bloco editorial fino com avatar real, bio e link para o perfil. Esconde-se
 * quando não há nem bio nem avatar — evita duplicar visualmente o `ReportHeader`
 * locked, que continua a renderizar `@username` e o gradiente como fallback.
 */
export function ReportEnrichedBio({ enriched, username }: Props) {
  const { bio, avatarUrl, profileUrl } = enriched.profile;
  const hasContent = Boolean(bio) || Boolean(avatarUrl);
  const [avatarError, setAvatarError] = useState(false);

  if (!hasContent) return null;

  return (
    <section
      aria-label="Perfil — bio e ligação ao Instagram"
      className="mx-auto max-w-7xl px-6 pt-4"
    >
      <div className="rounded-2xl border border-border-subtle/40 bg-surface-secondary/40 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
          <div className="shrink-0">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={`Avatar de @${username}`}
                onError={() => setAvatarError(true)}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-border-subtle/40"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400 via-blue-400 to-cyan-400 ring-2 ring-border-subtle/40"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-content-tertiary">
              {ENRICHED_COPY.bio.eyebrow}
            </p>
            {bio ? (
              <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed whitespace-pre-line">
                {bio}
              </p>
            ) : null}
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-primary hover:text-accent-luminous transition-colors"
            >
              {ENRICHED_COPY.bio.profileLinkLabel}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}