/**
 * React-PDF document for the v1 InstaBench report.
 *
 * Pure presentational component. All data must be pre-resolved upstream
 * (see `render.ts`) — no fetches, no DB calls, no AI here.
 */

import {
  Document,
  Image,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";

import type { BenchmarkPositioning } from "@/lib/benchmark/types";
import type {
  CompetitorAnalysis,
  PublicAnalysisContentSummary,
  PublicAnalysisProfile,
} from "@/lib/analysis/types";

import {
  COMPETITOR_COL_WIDTHS,
  PDF_COLORS,
  styles,
} from "./styles";
import type { PdfRecommendation } from "./recommendations";
import {
  deriveInitials,
  formatCount,
  formatInt,
  formatLongDate,
  formatPercent,
  formatShortDate,
  formatSignedPercent,
} from "./format";

/**
 * Pre-derived top post for the PDF. Resolved upstream in `render.ts` from the
 * snapshot's raw posts array — no Instagram CDN fetch, no thumbnail.
 */
export interface TopPostForPdf {
  id: string;
  format: string;
  /** ISO timestamp of the post (UTC). May be null for legacy snapshots. */
  takenAtIso: string | null;
  likes: number;
  comments: number;
  engagementPct: number;
  /** Caption excerpt, already trimmed and capped to ~180 chars upstream. */
  caption: string;
  /** Public permalink. May be null when neither permalink nor shortcode exists. */
  permalink: string | null;
}

export interface ReportDocumentInput {
  profile: PublicAnalysisProfile;
  contentSummary: PublicAnalysisContentSummary;
  competitors: CompetitorAnalysis[];
  benchmark?: BenchmarkPositioning;
  /** Pre-fetched avatar bytes encoded as a data URL. Optional. */
  avatarDataUrl?: string;
  /** Up to 3 top posts ranked by engagement_pct. Empty list = page omitted. */
  topPosts?: TopPostForPdf[];
  /**
   * 4–6 deterministic recommendations derived from snapshot data.
   * When fewer than 4 are available the page is omitted.
   */
  recommendations?: PdfRecommendation[];
  /** ISO timestamp of the underlying analysis snapshot. */
  analyzedAt: string;
  /** ISO timestamp of when the PDF itself is generated. */
  generatedAt: string;
}

const FOOTER_BRAND = "InstaBench";

function PageFooter({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {FOOTER_BRAND} · {formatShortDate(generatedAt)}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

function PageHeader({ kicker }: { kicker: string }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.brandMark}>INSTABENCH</Text>
      <Text style={styles.brandKicker}>{kicker}</Text>
    </View>
  );
}

function Avatar({
  profile,
  avatarDataUrl,
}: {
  profile: PublicAnalysisProfile;
  avatarDataUrl?: string;
}) {
  if (avatarDataUrl) {
    return <Image src={avatarDataUrl} style={styles.avatarImage} />;
  }
  return (
    <View style={styles.avatarBox}>
      <Text style={styles.avatarInitials}>
        {deriveInitials(profile.display_name, profile.username)}
      </Text>
    </View>
  );
}

function CoverPage({
  profile,
  avatarDataUrl,
  analyzedAt,
  generatedAt,
}: {
  profile: PublicAnalysisProfile;
  avatarDataUrl?: string;
  analyzedAt: string;
  generatedAt: string;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader kicker="Relatório de análise" />
      <View style={styles.coverWrap}>
        <Avatar profile={profile} avatarDataUrl={avatarDataUrl} />
        <Text style={styles.coverKicker}>Análise de perfil Instagram</Text>
        <Text style={styles.coverTitle}>Relatório de desempenho</Text>
        <Text style={styles.coverHandle}>@{profile.username}</Text>
        {profile.display_name && profile.display_name !== profile.username ? (
          <Text style={styles.coverDisplayName}>{profile.display_name}</Text>
        ) : null}
        <Text style={styles.coverDate}>
          Análise realizada a {formatLongDate(analyzedAt)}
        </Text>
      </View>
      <PageFooter generatedAt={generatedAt} />
    </Page>
  );
}

function ProfileMetricsPage({
  profile,
  contentSummary,
  generatedAt,
}: {
  profile: PublicAnalysisProfile;
  contentSummary: PublicAnalysisContentSummary;
  generatedAt: string;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader kicker={`@${profile.username}`} />

      <Text style={styles.sectionTitle}>Identidade do perfil</Text>
      <Text style={styles.sectionHeading}>Quem é o perfil analisado</Text>

      <View style={styles.identityRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.identityName}>
            {profile.display_name || profile.username}
          </Text>
          <Text style={styles.identityHandle}>@{profile.username}</Text>
          {profile.is_verified ? (
            <Text style={styles.verifiedBadge}>· PERFIL VERIFICADO</Text>
          ) : null}
          {profile.bio ? (
            <Text style={styles.identityBio}>{profile.bio}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.counterRow}>
        <View style={styles.counterCell}>
          <Text style={styles.counterValue}>
            {formatCount(profile.followers_count)}
          </Text>
          <Text style={styles.counterLabel}>Seguidores</Text>
        </View>
        <View style={styles.counterCell}>
          <Text style={styles.counterValue}>
            {formatCount(profile.following_count)}
          </Text>
          <Text style={styles.counterLabel}>A seguir</Text>
        </View>
        <View style={styles.counterCell}>
          <Text style={styles.counterValue}>
            {formatCount(profile.posts_count)}
          </Text>
          <Text style={styles.counterLabel}>Publicações</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Métricas de conteúdo</Text>
      <Text style={styles.sectionHeading}>Sinais-chave do desempenho</Text>

      <View style={styles.metricGrid}>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Taxa de envolvimento</Text>
          <Text style={styles.metricValue}>
            {formatPercent(contentSummary.average_engagement_rate)}
          </Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Publicações analisadas</Text>
          <Text style={styles.metricValue}>
            {formatInt(contentSummary.posts_analyzed)}
          </Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Média de gostos</Text>
          <Text style={styles.metricValue}>
            {formatCount(contentSummary.average_likes)}
          </Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Média de comentários</Text>
          <Text style={styles.metricValue}>
            {formatCount(contentSummary.average_comments)}
          </Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Formato dominante</Text>
          <Text style={styles.metricValue}>
            {contentSummary.dominant_format}
          </Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Publicações por semana</Text>
          <Text style={styles.metricValue}>
            {contentSummary.estimated_posts_per_week.toFixed(1).replace(".", ",")}
          </Text>
        </View>
      </View>

      <PageFooter generatedAt={generatedAt} />
    </Page>
  );
}

function BenchmarkPage({
  profile,
  benchmark,
  generatedAt,
}: {
  profile: PublicAnalysisProfile;
  benchmark: BenchmarkPositioning;
  generatedAt: string;
}) {
  const isAvailable = benchmark.status === "available";

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader kicker={`@${profile.username}`} />

      <Text style={styles.sectionTitle}>Posicionamento</Text>
      <Text style={styles.sectionHeading}>Benchmark vs perfis comparáveis</Text>

      {isAvailable ? (
        <View style={styles.benchCard}>
          <Text style={styles.benchTier}>
            {benchmark.accountTierLabel} · Formato {benchmark.dominantFormat}
          </Text>
          <Text style={styles.benchHeadline}>
            {benchmark.positionStatus === "above"
              ? "Acima do benchmark"
              : benchmark.positionStatus === "below"
                ? "Abaixo do benchmark"
                : "Em linha com o benchmark"}
          </Text>
          <Text
            style={[
              styles.benchDelta,
              {
                color:
                  benchmark.positionStatus === "above"
                    ? PDF_COLORS.positive
                    : benchmark.positionStatus === "below"
                      ? PDF_COLORS.negative
                      : PDF_COLORS.inkSoft,
              },
            ]}
          >
            {formatSignedPercent(benchmark.differencePercent)}
          </Text>
          <Text style={styles.benchExplanation}>
            {benchmark.shortExplanation}
          </Text>

          <View style={styles.benchCompareRow}>
            <View style={styles.benchCompareCell}>
              <Text style={styles.benchCompareLabel}>Perfil analisado</Text>
              <Text style={styles.benchCompareValue}>
                {formatPercent(benchmark.profileValue)}
              </Text>
            </View>
            <View style={styles.benchCompareCell}>
              <Text style={styles.benchCompareLabel}>Benchmark do tier</Text>
              <Text style={styles.benchCompareValue}>
                {formatPercent(benchmark.benchmarkValue)}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.benchCard}>
          <Text style={styles.benchHeadline}>Posicionamento indisponível</Text>
          <Text style={styles.benchExplanation}>
            Não existem dados suficientes para comparar este perfil com o
            benchmark do respetivo tier neste momento.
          </Text>
        </View>
      )}

      <PageFooter generatedAt={generatedAt} />
    </Page>
  );
}

function CompetitorsPage({
  profile,
  competitors,
  generatedAt,
}: {
  profile: PublicAnalysisProfile;
  competitors: CompetitorAnalysis[];
  generatedAt: string;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader kicker={`@${profile.username}`} />

      <Text style={styles.sectionTitle}>Comparação direta</Text>
      <Text style={styles.sectionHeading}>Concorrentes em análise</Text>
      <Text style={styles.sectionLead}>
        Confronto entre o perfil analisado e os concorrentes selecionados, com
        as métricas-base de cada conta.
      </Text>

      <View style={styles.table}>
        <View style={styles.tableHead}>
          <Text style={[styles.tableHeadCell, { width: COMPETITOR_COL_WIDTHS.handle }]}>
            Conta
          </Text>
          <Text style={[styles.tableHeadCell, { width: COMPETITOR_COL_WIDTHS.followers }]}>
            Seguidores
          </Text>
          <Text style={[styles.tableHeadCell, { width: COMPETITOR_COL_WIDTHS.engagement }]}>
            Envolvimento
          </Text>
          <Text style={[styles.tableHeadCell, { width: COMPETITOR_COL_WIDTHS.likes }]}>
            Méd. gostos
          </Text>
          <Text style={[styles.tableHeadCell, { width: COMPETITOR_COL_WIDTHS.comments }]}>
            Méd. coment.
          </Text>
        </View>

        {competitors.map((c, idx) => {
          const isLast = idx === competitors.length - 1;
          if (c.success) {
            return (
              <View
                key={c.profile.username}
                style={[styles.tableRow, isLast ? styles.tableRowLast : {}]}
              >
                <Text style={[styles.tableCell, { width: COMPETITOR_COL_WIDTHS.handle }]}>
                  @{c.profile.username}
                </Text>
                <Text style={[styles.tableCell, { width: COMPETITOR_COL_WIDTHS.followers }]}>
                  {formatCount(c.profile.followers_count)}
                </Text>
                <Text style={[styles.tableCell, { width: COMPETITOR_COL_WIDTHS.engagement }]}>
                  {formatPercent(c.content_summary.average_engagement_rate)}
                </Text>
                <Text style={[styles.tableCell, { width: COMPETITOR_COL_WIDTHS.likes }]}>
                  {formatCount(c.content_summary.average_likes)}
                </Text>
                <Text style={[styles.tableCell, { width: COMPETITOR_COL_WIDTHS.comments }]}>
                  {formatCount(c.content_summary.average_comments)}
                </Text>
              </View>
            );
          }
          return (
            <View
              key={c.username}
              style={[styles.tableRow, isLast ? styles.tableRowLast : {}]}
            >
              <Text style={[styles.tableCell, { width: COMPETITOR_COL_WIDTHS.handle }]}>
                @{c.username}
              </Text>
              <Text
                style={[
                  styles.tableCellMuted,
                  { width: `${parseFloat(COMPETITOR_COL_WIDTHS.followers) + parseFloat(COMPETITOR_COL_WIDTHS.engagement) + parseFloat(COMPETITOR_COL_WIDTHS.likes) + parseFloat(COMPETITOR_COL_WIDTHS.comments)}%` },
                ]}
              >
                Dados indisponíveis
              </Text>
            </View>
          );
        })}
      </View>

      <PageFooter generatedAt={generatedAt} />
    </Page>
  );
}

function TopPostsPage({
  profile,
  topPosts,
  generatedAt,
}: {
  profile: PublicAnalysisProfile;
  topPosts: TopPostForPdf[];
  generatedAt: string;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <PageHeader kicker={`@${profile.username}`} />

      <Text style={styles.sectionTitle}>Conteúdo de maior impacto</Text>
      <Text style={styles.sectionHeading}>Publicações com maior envolvimento</Text>
      <Text style={styles.sectionLead}>
        Selecção das três publicações com taxa de envolvimento mais elevada
        no período analisado. As miniaturas não são incluídas porque os
        endereços da Instagram expiram; usa o link para abrir cada post.
      </Text>

      {topPosts.map((post, idx) => {
        const isLast = idx === topPosts.length - 1;
        return (
          <View
            key={post.id}
            style={[styles.postCard, isLast ? styles.postCardLast : {}]}
            wrap={false}
          >
            <View style={styles.postMetaRow}>
              <Text style={styles.postFormatBadge}>{post.format}</Text>
              <Text style={styles.postDate}>
                {post.takenAtIso ? formatShortDate(post.takenAtIso) : "—"}
              </Text>
            </View>

            {post.caption ? (
              <Text style={styles.postCaption}>
                {post.caption}
                {post.caption.length >= 180 ? "…" : ""}
              </Text>
            ) : null}

            <View style={styles.postStatsRow}>
              <View style={styles.postStatCell}>
                <Text style={styles.postStatLabel}>Envolvimento</Text>
                <Text style={styles.postStatValue}>
                  {formatPercent(post.engagementPct)}
                </Text>
              </View>
              <View style={styles.postStatCell}>
                <Text style={styles.postStatLabel}>Gostos</Text>
                <Text style={styles.postStatValue}>
                  {formatCount(post.likes)}
                </Text>
              </View>
              <View style={styles.postStatCell}>
                <Text style={styles.postStatLabel}>Comentários</Text>
                <Text style={styles.postStatValue}>
                  {formatCount(post.comments)}
                </Text>
              </View>
            </View>

            {post.permalink ? (
              <Text style={styles.postPermalink}>{post.permalink}</Text>
            ) : (
              <Text style={styles.postPermalinkMissing}>
                Link público indisponível
              </Text>
            )}
          </View>
        );
      })}

      <PageFooter generatedAt={generatedAt} />
    </Page>
  );
}

export function ReportDocument(input: ReportDocumentInput) {
  const {
    profile,
    contentSummary,
    competitors,
    benchmark,
    avatarDataUrl,
    topPosts,
    analyzedAt,
    generatedAt,
  } = input;

  return (
    <Document
      title={`InstaBench · @${profile.username}`}
      author="InstaBench"
      subject="Relatório de análise Instagram"
      creator="InstaBench"
      producer="InstaBench"
    >
      <CoverPage
        profile={profile}
        avatarDataUrl={avatarDataUrl}
        analyzedAt={analyzedAt}
        generatedAt={generatedAt}
      />
      <ProfileMetricsPage
        profile={profile}
        contentSummary={contentSummary}
        generatedAt={generatedAt}
      />
      {benchmark ? (
        <BenchmarkPage
          profile={profile}
          benchmark={benchmark}
          generatedAt={generatedAt}
        />
      ) : null}
      {competitors.length > 0 ? (
        <CompetitorsPage
          profile={profile}
          competitors={competitors}
          generatedAt={generatedAt}
        />
      ) : null}
      {topPosts && topPosts.length > 0 ? (
        <TopPostsPage
          profile={profile}
          topPosts={topPosts}
          generatedAt={generatedAt}
        />
      ) : null}
    </Document>
  );
}
