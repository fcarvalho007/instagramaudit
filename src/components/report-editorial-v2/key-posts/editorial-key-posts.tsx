import {
  GalleryHorizontalEnd,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Play,
} from "lucide-react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";

import { ReportBand } from "../primitives/report-band";
import { SectionIntro } from "../primitives/section-intro";
import { StatusPill } from "../primitives/status-pill";
import { ObservationBlock } from "../primitives/observation-block";
import { ReadingBlock } from "../primitives/reading-block";
import { EDITORIAL_V2_DISPLAY_NUMBERS } from "../section-metadata";
import { useReveal } from "../overview/use-count-up";
import {
  buildEditorialKeyPostsData,
  formatPtNumber,
  type EditorialKeyPostsData,
  type KeyPost,
} from "./key-posts-data";

function FormatIcon({ format, className }: { format: string; className?: string }) {
  if (format === "Carousel")
    return <GalleryHorizontalEnd className={className} aria-hidden="true" />;
  if (format === "Reel") return <Play className={className} aria-hidden="true" />;
  return <ImageIcon className={className} aria-hidden="true" />;
}

function formatLabelPt(format: string): string {
  if (format === "Carousel") return "Carrossel";
  if (format === "Reel") return "Reel";
  return "Imagem";
}

export function buildKeyPostsObservations(data: EditorialKeyPostsData): string[] {
  const out: string[] = [];
  if (data.sampleSize === 0) {
    return ["Não há publicações com envolvimento registado nesta janela."];
  }

  out.push(
    data.sampleSize === 1
      ? "A amostra tem apenas 1 publicação, pelo que não existe comparação entre extremos."
      : `A amostra tem ${data.sampleSize} publicações, com um envolvimento médio de ${formatPtNumber(data.average)}%.`,
  );

  const { best, worst } = data;
  if (best && worst) {
    out.push(
      `A melhor publicação tem ${formatPtNumber(best.engagementPct)}% de envolvimento e a pior tem ${formatPtNumber(worst.engagementPct)}%.`,
    );
    out.push(
      best.format === worst.format
        ? `As duas publicações são do mesmo formato (${formatLabelPt(best.format).toLowerCase()}).`
        : `As duas publicações são de formatos diferentes: ${formatLabelPt(best.format).toLowerCase()} e ${formatLabelPt(worst.format).toLowerCase()}.`,
    );

    const likeDiff = Math.abs(best.likes - worst.likes);
    const commentDiff = Math.abs(best.comments - worst.comments);
    out.push(
      `Diferença de ${likeDiff.toLocaleString("pt-PT")} gostos e ${commentDiff.toLocaleString("pt-PT")} comentários entre as duas publicações.`,
    );

    if (best.takenAtIso && worst.takenAtIso) {
      const days = Math.round(
        Math.abs(Date.parse(best.takenAtIso) - Date.parse(worst.takenAtIso)) /
          86_400_000,
      );
      if (Number.isFinite(days)) {
        out.push(
          days === 0
            ? "As duas publicações foram publicadas no mesmo dia."
            : `Foram publicadas com ${days} ${days === 1 ? "dia" : "dias"} de intervalo.`,
        );
      }
    }
  } else if (data.sampleSize > 1) {
    out.push(
      "A amostra ainda não tem publicações suficientes para o relatório destacar uma melhor e uma pior publicação.",
    );
  }

  if (data.flatSample && data.sampleSize > 1) {
    out.push("Todas as publicações da amostra têm o mesmo envolvimento.");
  }

  return out;
}

export function buildKeyPostsReading(
  data: EditorialKeyPostsData,
): { hypothesis: string; confidence: "baixa" | "média" | "alta" } | null {
  const { best, worst } = data;
  if (!best || !worst) return null;

  const shared: string[] = [];
  if (best.format === worst.format)
    shared.push(`o mesmo formato (${formatLabelPt(best.format).toLowerCase()})`);
  const sameWindow =
    best.takenAtIso && worst.takenAtIso
      ? Math.abs(Date.parse(best.takenAtIso) - Date.parse(worst.takenAtIso)) <=
        31 * 86_400_000
      : false;
  if (sameWindow) shared.push("um intervalo de publicação próximo");

  const sharedText =
    shared.length > 0
      ? `As duas publicações partilham ${shared.join(" e ")}. `
      : "As duas publicações não partilham formato nem proximidade temporal evidente. ";

  if (data.amplitude.kind === "none") {
    return {
      hypothesis:
        "Não há variação mensurável entre publicações nesta amostra, por isso não é possível ler diferenças de desempenho.",
      confidence: "baixa",
    };
  }

  return {
    hypothesis:
      `${sharedText}Os dados mostram a diferença de resultado, mas não permitem atribuir causalidade. ` +
      "Uma hipótese a testar é se características observáveis do conteúdo — abertura do texto, tema ou momento de publicação — se repetem nas publicações com maior resposta.",
    confidence: data.sampleSize >= 8 ? "média" : "baixa",
  };
}

function DistributionChart({ data }: { data: EditorialKeyPostsData }) {
  const dotSize =
    data.points.length > 24 ? 7 : data.points.length > 12 ? 9 : 11;

  const first = data.points[0];
  const last = data.points[data.points.length - 1];

  return (
    <div
      className="rounded-[10px] border p-[var(--ev2-s3)]"
      style={{ background: "var(--ev2-surface)", borderColor: "var(--ev2-hair)" }}
    >
      <div className="mb-[var(--ev2-s2)] flex flex-wrap items-baseline justify-between gap-[8px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ev2-ink-3)]">
          Distribuição do envolvimento
        </p>
        <p className="ev2-tabular text-[12px] text-[var(--ev2-ink-3)]">
          Média {formatPtNumber(data.average)}%
        </p>
      </div>

      {/* Pontos posicionados em percentagem: mantêm-se circulares em
          qualquer largura, sem distorção de escala. */}
      <div
        role="img"
        aria-label={`Envolvimento de ${data.sampleSize} publicações, média de ${formatPtNumber(data.average)} por cento`}
        className="relative h-[150px] w-full sm:h-[190px]"
      >
        <div
          className="absolute inset-x-0 border-t border-dashed"
          style={{
            borderColor: "var(--ev2-hair-2)",
            top: `${(1 - data.averageY) * 84 + 8}%`,
          }}
        />
        {data.points.map((p) => {
          const size = p.isBest || p.isWorst ? dotSize * 1.7 : dotSize;
          return (
            <span
              key={p.id}
              title={`${p.date} · ${formatLabelPt(p.format)} · ${formatPtNumber(p.engagementPct)}%`}
              className="absolute rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `calc(${p.x * 92 + 4}% - ${size / 2}px)`,
                top: `calc(${(1 - p.y) * 84 + 8}% - ${size / 2}px)`,
                background: p.isBest
                  ? "var(--ev2-blue)"
                  : p.isWorst
                    ? "var(--ev2-danger)"
                    : "var(--ev2-blue-3)",
              }}
            />
          );
        })}
      </div>


      <div className="mt-[var(--ev2-s2)] flex items-center justify-between text-[12px] text-[var(--ev2-ink-3)]">
        <span>{first?.date ?? ""}</span>
        <span>{last && last !== first ? last.date : ""}</span>
      </div>
    </div>
  );
}

function PostCard({
  post,
  label,
  tone,
  deltaPct,
}: {
  post: KeyPost;
  label: string;
  tone: "best" | "worst";
  deltaPct: number | null;
}) {
  const accent = tone === "best" ? "var(--ev2-blue)" : "var(--ev2-danger)";
  const caption = post.caption?.trim() ?? "";

  return (
    <article
      className="flex flex-col gap-[var(--ev2-s2)] rounded-[10px] border p-[var(--ev2-s3)]"
      style={{ background: "var(--ev2-surface)", borderColor: "var(--ev2-hair)" }}
    >
      <div className="flex items-center justify-between gap-[8px]">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: accent }}
        >
          {label}
        </span>
        <span className="ev2-tabular text-[12px] text-[var(--ev2-ink-3)]">
          {post.date}
        </span>
      </div>

      <div className="flex items-start gap-[var(--ev2-s2)]">
        <div
          className="size-[72px] shrink-0 overflow-hidden rounded-[8px] border sm:size-[88px]"
          style={{ background: "var(--ev2-hair)", borderColor: "var(--ev2-hair-2)" }}
        >
          {post.thumbnailUrl ? (
            <img
              src={post.thumbnailUrl}
              alt={`Publicação de ${post.date}`}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <span
              className="flex size-full items-center justify-center"
              aria-label={`Publicação de ${post.date} sem imagem disponível`}
            >
              <FormatIcon
                format={post.format}
                className="size-[20px] text-[var(--ev2-ink-4)]"
              />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="ev2-tabular text-[28px] leading-[1.1]"
            style={{ color: accent }}
          >
            {formatPtNumber(post.engagementPct)}%
          </p>
          <p className="mt-[2px] text-[12px] text-[var(--ev2-ink-3)]">
            {formatLabelPt(post.format)}
            {deltaPct !== null
              ? ` · ${deltaPct >= 0 ? "+" : "−"}${formatPtNumber(Math.abs(deltaPct), 0)}% vs. média`
              : ""}
          </p>
          <div className="mt-[var(--ev2-s1)] flex flex-wrap items-center gap-[12px] text-[13px] text-[var(--ev2-ink-2)]">
            <span className="inline-flex items-center gap-[5px]">
              <Heart aria-hidden="true" className="size-[13px]" />
              <span className="ev2-tabular">
                {post.likes.toLocaleString("pt-PT")}
              </span>
            </span>
            <span className="inline-flex items-center gap-[5px]">
              <MessageCircle aria-hidden="true" className="size-[13px]" />
              <span className="ev2-tabular">
                {post.comments.toLocaleString("pt-PT")}
              </span>
            </span>
          </div>
        </div>
      </div>

      {caption.length > 0 ? (
        <p className="line-clamp-3 text-[14px] leading-[1.6] text-[var(--ev2-ink-2)]">
          {caption}
        </p>
      ) : (
        <p className="text-[13px] italic text-[var(--ev2-ink-3)]">
          Sem legenda registada nesta publicação.
        </p>
      )}
    </article>
  );
}

/**
 * Publicações-chave — Editorial V2 (Fase E).
 *
 * Apresentação pura sobre dados já carregados. A média e os deltas vêm do
 * helper partilhado com o bloco de produção; melhor e pior são exactamente
 * as publicações que a produção selecciona. Sem rede, sem entitlements
 * adicionais, sem valores da referência visual.
 */
export function EditorialKeyPosts({
  result,
  performanceSampleSize = 0,
  /** Estado anónimo: mesma regra de produção — sem valores analíticos. */
  analyticsVisible = true,
}: {
  result: AdapterResult;
  performanceSampleSize?: number;
  analyticsVisible?: boolean;
}) {
  const data = buildEditorialKeyPostsData(result, performanceSampleSize);
  const { ref, revealed } = useReveal<HTMLDivElement>();

  if (data.sampleSize === 0 && !data.best) return null;

  const lede = !data.hasComparison
    ? "Ainda não há publicações suficientes para comparar extremos nesta janela."
    : data.amplitude.kind === "ratio"
      ? `Existe uma diferença de ${data.amplitude.ratio}× entre a publicação com maior e menor envolvimento na amostra.`
      : data.amplitude.kind === "points"
        ? `A melhor e a pior publicação apresentam uma diferença de ${formatPtNumber(data.amplitude.points)} pontos percentuais.`
        : "As publicações da amostra não apresentam amplitude mensurável de envolvimento.";

  const observations = buildKeyPostsObservations(data);
  const reading = buildKeyPostsReading(data);

  return (
    <ReportBand
      id="publicacoes-chave"
      labelledBy="ev2-publicacoes-title"
      context={
        <div className="flex flex-col gap-[var(--ev2-s3)]">
          <SectionIntro
            displayNumber={EDITORIAL_V2_DISPLAY_NUMBERS["publicacoes-chave"]}
            title="A distância entre os dois extremos"
            subtitle={analyticsVisible ? lede : undefined}
            headingId="ev2-publicacoes-title"
            headingLevel={2}
          />
          {analyticsVisible && data.amplitude.kind !== "unavailable" ? (
            <div>
              <StatusPill tone="neutral" label={data.amplitude.label} />
            </div>
          ) : null}
          {analyticsVisible ? (
            <p className="max-w-[46ch] text-[13px] leading-[1.6] text-[var(--ev2-ink-3)]">
              {data.calculationNote}
            </p>
          ) : (
            <p className="max-w-[46ch] text-[13px] leading-[1.6] text-[var(--ev2-ink-3)]">
              Os valores de envolvimento, gostos e comentários por publicação
              ficam disponíveis depois de indicares o teu email.
            </p>
          )}
        </div>
      }
    >
      {/* Sentinela de revelação: o observador vigia um elemento curto, para
          que blocos mais altos que o ecrã revelem sempre. */}
      <div ref={ref} aria-hidden="true" className="h-px w-full" />
      <div
        data-revealed={revealed ? "true" : "false"}
        className="flex flex-col gap-[var(--ev2-s4)] transition-[opacity,transform] duration-700 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none data-[revealed=false]:translate-y-[14px] data-[revealed=false]:opacity-0"
      >
        {analyticsVisible && data.points.length >= 3 ? (
          <DistributionChart data={data} />
        ) : null}

        {analyticsVisible && data.best ? (
          <div className="grid grid-cols-1 gap-[var(--ev2-s3)] lg:grid-cols-2">
            <PostCard
              post={data.best}
              label="Melhor publicação"
              tone="best"
              deltaPct={data.bestDeltaPct}
            />
            {data.worst ? (
              <PostCard
                post={data.worst}
                label="Pior publicação"
                tone="worst"
                deltaPct={data.worstDeltaPct}
              />
            ) : null}
          </div>
        ) : null}

        {analyticsVisible ? <ObservationBlock statements={observations} /> : null}

        {analyticsVisible && reading ? (
          <ReadingBlock
            hypothesis={reading.hypothesis}
            confidence={reading.confidence}
          />
        ) : null}
      </div>
    </ReportBand>
  );
}
