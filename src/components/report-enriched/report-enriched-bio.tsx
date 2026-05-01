import { ExternalLink } from "lucide-react";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { ENRICHED_COPY } from "./report-enriched-copy";

interface Props {
  enriched: ReportEnriched;
  username: string;
}

/**
 * Faixa tipográfica fina (tier 3) com a bio textual e link para o Instagram.
 * O `ReportHeader` locked já mostra `@username` + avatar gradiente, por isso
 * esta companion não duplica nem identidade nem avatar — apresenta-se como
 * uma nota editorial sem card pesado, imediatamente abaixo do header.
 * Esconde-se quando não há bio.
 */
export function ReportEnrichedBio({ enriched, username: _username }: Props) {
  const { bio, profileUrl } = enriched.profile;
  if (!bio) return null;

  return (
    <section
      aria-label="Perfil — bio e ligação ao Instagram"
      className="mx-auto max-w-7xl px-6 pt-4"
    >
      <div className="border-t border-border-subtle/30 pt-4 min-w-0 space-y-2">
        <p className="text-eyebrow-sm text-content-tertiary">
          {ENRICHED_COPY.bio.eyebrow}
        </p>
        <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed whitespace-pre-line max-w-3xl">
          {bio}
        </p>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-eyebrow inline-flex items-center gap-1.5 text-accent-primary hover:text-accent-luminous transition-colors"
        >
          {ENRICHED_COPY.bio.profileLinkLabel}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}