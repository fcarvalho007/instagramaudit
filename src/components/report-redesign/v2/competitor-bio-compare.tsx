import { CompareCardShell, CompareTable } from "@/components/report-redesign/v2/compare";
import type { CompareTableRow } from "@/components/report-redesign/v2/compare";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";

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

  const rows: CompareTableRow[] = [];

  // Link na bio — yes/no derived from externalUrls presence.
  if (primaryLinkCount > 0 || competitorLinkCount > 0) {
    rows.push({
      label: "Link na bio",
      primary: primaryLinkCount > 0 ? "Sim" : "Não",
      competitor: competitorLinkCount > 0 ? "Sim" : "Não",
    });
  }

  // Nº de links — only when at least one side has links.
  if (primaryLinkCount > 0 || competitorLinkCount > 0) {
    rows.push({
      label: "Nº de links",
      primary: String(primaryLinkCount),
      competitor: String(competitorLinkCount),
    });
  }

  // Conta verificada — always renderable (boolean).
  rows.push({
    label: "Conta verificada",
    primary: primaryVerified ? "Sim" : "Não",
    competitor: competitor.isVerified ? "Sim" : "Não",
  });

  // Bio preenchida — yes/no.
  rows.push({
    label: "Bio preenchida",
    primary: primaryHasBio ? "Sim" : "Não",
    competitor: competitorHasBio ? "Sim" : "Não",
  });

  if (rows.length === 0) return null;

  const caption = buildInsight(primaryLinkCount, competitorLinkCount);

  return (
    <CompareCardShell
      title="Bio e pontos de saída"
      subtitle="Sinais qualitativos do perfil"
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
      footer={caption}
    >
      <CompareTable
        variant="bare"
        label="Bio e pontos de saída"
        primaryHandle={primaryHandle}
        competitorHandle={competitor.username}
        rows={rows}
      />
    </CompareCardShell>
  );
}

function buildInsight(primaryLinks: number, competitorLinks: number): string {
  if (competitorLinks > primaryLinks) {
    return "O concorrente apresenta mais pontos de saída na bio.";
  }
  if (primaryLinks > competitorLinks) {
    return "Este perfil tem uma presença de bio mais completa.";
  }
  return "Os dois perfis têm sinais de bio semelhantes.";
}