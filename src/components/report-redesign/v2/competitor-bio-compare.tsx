import { CompareCardShell } from "@/components/report-redesign/v2/compare";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import { BadgeCheck, FileText, Link2, ListOrdered, type LucideIcon } from "lucide-react";

interface Props {
  primaryHandle: string;
  primaryAvatarUrl?: string | null;
  primaryFullName?: string | null;
  primaryBio: string | null;
  primaryExternalUrls: string[];
  primaryVerified: boolean;
  competitor: ReportCompetitorBreakdownEntry;
}

/**
 * Pro-only qualitative bio/links comparison (Padrão 3).
 *
 * Compares lightweight profile-level signals between the primary profile
 * and the first competitor. Renders nothing when no row has data on
 * either side. Conservative deterministic insight, no AI, no conversion
 * claims.
 *
 * TODO: multi-competitor support — today we only render against
 * `competitorBreakdown[0]`.
 */
export function CompetitorBioCompare({
  primaryHandle,
  primaryAvatarUrl,
  primaryFullName,
  primaryBio,
  primaryExternalUrls,
  primaryVerified,
  competitor,
}: Props) {
  const primaryLinkCount = primaryExternalUrls.length;
  const competitorLinkCount = competitor.externalUrls.length;
  const primaryHasBio =
    typeof primaryBio === "string" && primaryBio.trim().length > 0;
  const competitorHasBio =
    typeof competitor.bio === "string" && competitor.bio.trim().length > 0;

  const primarySignals: ProfileSignals = {
    linkCount: primaryLinkCount,
    verified: primaryVerified,
    hasBio: primaryHasBio,
  };
  const competitorSignals: ProfileSignals = {
    linkCount: competitorLinkCount,
    verified: competitor.isVerified,
    hasBio: competitorHasBio,
  };

  const deltas = buildDeltas(primarySignals, competitorSignals);
  const verdict = buildEditorialVerdict(primarySignals, competitorSignals);

  return (
    <CompareCardShell
      title="Caminho de conversão fora do Instagram"
      subtitle="Bio, verificação e pontos de saída"
      windowAligned={competitor.windowAligned}
      primary={{
        handle: primaryHandle,
        avatarUrl: primaryAvatarUrl ?? null,
        isVerified: primaryVerified,
        displayName: primaryFullName ?? null,
      }}
      competitor={{
        handle: competitor.username,
        avatarUrl: competitor.avatarUrl ?? null,
        isVerified: competitor.isVerified,
        displayName: competitor.displayName,
      }}
      footer={verdict}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <ProfilePanel handle={primaryHandle} side="primary" signals={primarySignals} />
          <ProfilePanel
            handle={competitor.username}
            side="competitor"
            signals={competitorSignals}
          />
        </div>
        {deltas.length > 0 ? (
          <p className="border-t border-default pt-3 text-sm text-content-secondary">
            {deltas.join(" · ")}
          </p>
        ) : null}
      </div>
    </CompareCardShell>
  );
}

interface ProfileSignals {
  linkCount: number;
  verified: boolean;
  hasBio: boolean;
}

type Side = "primary" | "competitor";
type Tone = "positive" | "attention" | "neutral";

const SIDE_ACCENT: Record<Side, string> = {
  primary: "var(--accent-primary)",
  competitor: "var(--accent-secondary)",
};

interface Row {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
}

function rowsFor(s: ProfileSignals): Row[] {
  return [
    {
      label: "Link na bio",
      value: s.linkCount > 0 ? "Sim" : "Não",
      icon: Link2,
      tone: s.linkCount > 0 ? "positive" : "attention",
    },
    {
      label: "Nº de links",
      value: String(s.linkCount),
      icon: ListOrdered,
      tone: s.linkCount > 0 ? "neutral" : "attention",
    },
    {
      label: "Conta verificada",
      value: s.verified ? "Sim" : "Não",
      icon: BadgeCheck,
      tone: s.verified ? "positive" : "neutral",
    },
    {
      label: "Bio preenchida",
      value: s.hasBio ? "Sim" : "Não",
      icon: FileText,
      tone: s.hasBio ? "positive" : "attention",
    },
  ];
}

function toneStyle(tone: Tone): { color: string; chipBg: string } {
  if (tone === "positive") {
    return {
      color: "var(--signal-positive)",
      chipBg: "color-mix(in oklab, var(--signal-positive) 12%, transparent)",
    };
  }
  if (tone === "attention") {
    return {
      color: "var(--signal-attention)",
      chipBg: "color-mix(in oklab, var(--signal-attention) 12%, transparent)",
    };
  }
  return { color: "var(--content-secondary)", chipBg: "transparent" };
}

function ProfilePanel({
  handle,
  side,
  signals,
}: {
  handle: string;
  side: Side;
  signals: ProfileSignals;
}) {
  const rows = rowsFor(signals);
  return (
    <div
      className="rounded-lg border border-default bg-surface-muted/40 p-5"
      style={{ borderTopColor: SIDE_ACCENT[side], borderTopWidth: 2 }}
    >
      <div className="text-eyebrow-sm mb-3" style={{ color: SIDE_ACCENT[side] }}>
        @{handle}
      </div>
      <ul className="divide-y divide-[color:var(--border-default)]/60">
        {rows.map((r) => {
          const Icon = r.icon;
          const tone = toneStyle(r.tone);
          const isNumber = r.label === "Nº de links";
          return (
            <li
              key={r.label}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
              aria-label={`${r.label}: ${r.value}`}
            >
              <span className="flex items-center gap-2 text-content-secondary">
                <Icon size={16} aria-hidden style={{ color: tone.color }} />
                {r.label}
              </span>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 ${
                  isNumber ? "font-semibold tabular-nums" : "font-medium"
                }`}
                style={{ background: tone.chipBg, color: tone.color }}
              >
                {r.value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function buildDeltas(p: ProfileSignals, c: ProfileSignals): string[] {
  const out: string[] = [];
  const linkDiff = c.linkCount - p.linkCount;
  if (linkDiff > 0) out.push(`+${linkDiff} ponto${linkDiff === 1 ? "" : "s"} de saída no concorrente`);
  else if (linkDiff < 0) out.push(`+${-linkDiff} ponto${-linkDiff === 1 ? "" : "s"} de saída neste perfil`);

  if (c.verified && !p.verified) out.push("Verificação só no concorrente");
  else if (p.verified && !c.verified) out.push("Verificação só neste perfil");

  if (p.hasBio && !c.hasBio) out.push("Concorrente sem bio preenchida");
  else if (c.hasBio && !p.hasBio) out.push("Este perfil sem bio preenchida");

  return out.slice(0, 3);
}

function score(s: ProfileSignals): number {
  return s.linkCount + (s.verified ? 1 : 0) + (s.hasBio ? 1 : 0);
}

function buildEditorialVerdict(p: ProfileSignals, c: ProfileSignals): string {
  const linkDiff = c.linkCount - p.linkCount;
  const diff = score(c) - score(p);

  if (linkDiff >= 2) return "O concorrente apresenta mais pontos de saída.";
  if (linkDiff <= -2) return "Este perfil tem menos fricção na bio, com mais pontos de saída.";
  if (diff >= 2) return "O concorrente projeta uma bio mais completa e credível.";
  if (diff <= -2) return "Este perfil tem uma bio mais completa que o concorrente.";
  if (Math.abs(diff) <= 1 && Math.abs(linkDiff) <= 1) return "Ambos têm uma base semelhante na bio.";
  return "Os dois perfis têm sinais de bio semelhantes.";
}