import { GalleryHorizontalEnd, Image as ImageIcon, Play } from "lucide-react";

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";

import { ReportBand } from "../primitives/report-band";
import { SectionIntro } from "../primitives/section-intro";
import { StatusPill } from "../primitives/status-pill";
import { ObservationBlock } from "../primitives/observation-block";
import { ReadingBlock } from "../primitives/reading-block";
import { EDITORIAL_V2_DISPLAY_NUMBERS } from "../section-metadata";
import { useReveal } from "../overview/use-count-up";
import {
  buildEditorialFormatMixData,
  type EditorialFormatMixData,
  type FormatMixPost,
  type FormatSegment,
} from "./format-mix-data";

const SEGMENT_COLOR: Record<string, string> = {
  Carousels: "var(--ev2-blue)",
  Reels: "var(--ev2-blue-2)",
  Imagens: "var(--ev2-blue-3)",
};

function segmentColor(seg: FormatSegment): string {
  return SEGMENT_COLOR[seg.key] ?? "var(--ev2-hair-2)";
}

function listPt(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function lowerLabel(label: string): string {
  return label.toLowerCase();
}

export function buildFormatObservations(data: EditorialFormatMixData): string[] {
  if (!data.hasFormatData) {
    return [
      `Não há publicações com formato classificado no ${data.windowLabel}.`,
    ];
  }

  const out: string[] = [];
  const sorted = [...data.presentSegments].sort((a, b) => b.count - a.count);

  for (const seg of sorted) {
    out.push(
      `${seg.count} de ${data.countedPosts} publicações são ${lowerLabel(seg.label)} (${seg.sharePct}%).`,
    );
  }

  out.push(
    data.formatsUsed === 1
      ? "Foi usado apenas 1 formato no período analisado."
      : `Foram usados ${data.formatsUsed} formatos diferentes no período analisado.`,
  );

  return out;
}

export function buildFormatReading(data: EditorialFormatMixData): {
  hypothesis: string;
  confidence: "baixa" | "média" | "alta";
} {
  if (!data.hasFormatData || data.countedPosts === 0) {
    return {
      hypothesis:
        "Sem publicações classificadas por formato, não é possível ler o mix editorial desta janela.",
      confidence: "baixa",
    };
  }
  if (data.countedPosts < 5) {
    return {
      hypothesis:
        "A amostra é pequena, por isso o mix observado pode não representar o hábito habitual do perfil. Vale a pena confirmar com uma janela maior antes de mudar a estratégia de formatos.",
      confidence: "baixa",
    };
  }
  const dominant = data.dominant;
  if (dominant && dominant.sharePct >= 60) {
    return {
      hypothesis: `Os dados sugerem uma forte concentração em ${lowerLabel(dominant.label)}. Uma hipótese a testar é aumentar a variedade de formatos e observar se isso altera o envolvimento, sem assumir à partida que o formato explica os resultados actuais.`,
      confidence: "média",
    };
  }
  if (data.formatsUsed >= 3) {
    return {
      hypothesis:
        "O mix cobre vários formatos. Manter esta variedade pode criar oportunidades diferentes de distribuição — uma leitura a confirmar cruzando com o envolvimento por publicação.",
      confidence: "média",
    };
  }
  return {
    hypothesis:
      "O mix está repartido por poucos formatos, sem um domínio claro. Testar um formato adicional de forma consistente é uma hipótese simples para perceber se muda a distribuição.",
    confidence: "média",
  };
}

function FormatRing({ data }: { data: EditorialFormatMixData }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex items-center justify-center">
      <svg
        viewBox="0 0 140 140"
        role="img"
        aria-label={`Distribuição por formato em ${data.countedPosts} publicações`}
        className="h-[140px] w-[140px] shrink-0 -rotate-90"
      >
        <circle
          cx="70"
          cy="70"
          r={R}
          fill="none"
          stroke="var(--ev2-hair)"
          strokeWidth="16"
        />
        {data.presentSegments.map((seg) => {
          const len = seg.fraction * C;
          const dash = `${len} ${C - len}`;
          const dashOffset = -offset;
          offset += len;
          return (
            <circle
              key={seg.key}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={segmentColor(seg)}
              strokeWidth={seg.isDominant ? 18 : 16}
              strokeDasharray={dash}
              strokeDashoffset={dashOffset}
            />
          );
        })}
      </svg>
    </div>
  );
}

function PostThumb({ post }: { post: FormatMixPost }) {
  const Icon =
    post.type === "reel" || post.type === "video"
      ? Play
      : post.type === "carousel"
        ? GalleryHorizontalEnd
        : ImageIcon;

  return (
    <li
      className="relative aspect-square overflow-hidden rounded-[6px] border"
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
          <Icon aria-hidden="true" className="size-[18px] text-[var(--ev2-ink-4)]" />
        </span>
      )}
    </li>
  );
}

/**
 * Mix de formatos — Editorial V2 (Fase D).
 *
 * Apresentação pura: contagens e quotas vêm do helper partilhado de
 * produção, thumbnails vêm do snapshot já carregado. Sem entitlements
 * adicionais, sem pedidos de rede, sem valores da referência visual.
 */
export function EditorialFormatMix({
  result,
  payload,
}: {
  result: AdapterResult;
  payload?: SnapshotPayload;
}) {
  const data = buildEditorialFormatMixData(result, payload);
  const { ref, revealed } = useReveal<HTMLDivElement>();

  const observations = buildFormatObservations(data);
  const reading = buildFormatReading(data);

  const subtitle = data.hasFormatData
    ? `Nesta janela foram classificadas ${data.countedPosts} publicações em ${data.formatsUsed === 1 ? "1 formato" : `${data.formatsUsed} formatos`}${
        data.dominant
          ? `, com predominância de ${lowerLabel(data.dominant.label)}`
          : ""
      }.`
    : "Ainda não há publicações com formato classificado nesta janela.";

  return (
    <ReportBand
      id="formatos"
      labelledBy="ev2-formatos-title"
      context={
        <div className="flex flex-col gap-[var(--ev2-s3)]">
          <SectionIntro
            displayNumber={EDITORIAL_V2_DISPLAY_NUMBERS["formatos"]}
            title="O que costumas publicar"
            subtitle={subtitle}
            headingId="ev2-formatos-title"
            headingLevel={2}
          />
          <div>
            <StatusPill tone={data.status.tone} label={data.status.label} />
          </div>
          <p className="max-w-[46ch] text-[13px] leading-[1.6] text-[var(--ev2-ink-3)]">
            {data.calculationNote}
          </p>
        </div>
      }
    >
      <div
        ref={ref}
        data-revealed={revealed ? "true" : "false"}
        className="flex flex-col gap-[var(--ev2-s4)] transition-[opacity,transform] duration-700 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none data-[revealed=false]:translate-y-[14px] data-[revealed=false]:opacity-0"
      >
        {/* A + B. Composição e legenda */}
        <div
          className="rounded-[10px] border p-[var(--ev2-s3)]"
          style={{
            background: "var(--ev2-surface)",
            borderColor: "var(--ev2-hair)",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ev2-ink-3)]">
            Composição por formato
          </p>

          {data.hasFormatData ? (
            <div className="mt-[var(--ev2-s3)] flex flex-col items-center gap-[var(--ev2-s3)] sm:flex-row sm:items-center sm:gap-[var(--ev2-s4)]">
              <FormatRing data={data} />
              <ul className="flex w-full min-w-0 flex-col gap-[var(--ev2-s2)]">
                {[...data.presentSegments]
                  .sort((a, b) => b.count - a.count)
                  .map((seg) => (
                    <li
                      key={seg.key}
                      className="flex min-w-0 items-baseline justify-between gap-[var(--ev2-s2)]"
                    >
                      <span className="flex min-w-0 items-center gap-[8px]">
                        <span
                          aria-hidden="true"
                          className="size-[9px] shrink-0 rounded-full"
                          style={{ background: segmentColor(seg) }}
                        />
                        <span
                          className={`truncate text-[14px] ${seg.isDominant ? "font-semibold text-[var(--ev2-ink)]" : "text-[var(--ev2-ink-2)]"}`}
                        >
                          {seg.label}
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] tabular-nums text-[var(--ev2-ink-3)]">
                        {seg.count} de {data.countedPosts}
                        <span className="ml-[10px] font-semibold text-[var(--ev2-ink)]">
                          {seg.sharePct}%
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <p className="mt-[var(--ev2-s2)] text-[14px] leading-[1.6] text-[var(--ev2-ink-2)]">
              Sem dados de formato para esta amostra.
            </p>
          )}
        </div>

        {/* C. Publicações reais da amostra */}
        {data.posts.length > 0 ? (
          <div
            className="rounded-[10px] border p-[var(--ev2-s3)]"
            style={{
              background: "var(--ev2-surface)",
              borderColor: "var(--ev2-hair)",
            }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-[var(--ev2-s2)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ev2-ink-3)]">
                Publicações da amostra
              </p>
              <p className="text-[12px] tabular-nums text-[var(--ev2-ink-3)]">
                {data.hiddenPostCount > 0
                  ? `A mostrar ${data.visiblePosts.length} de ${data.posts.length} publicações analisadas`
                  : `${data.posts.length} publicações analisadas`}
              </p>
            </div>
            <ul className="mt-[var(--ev2-s3)] grid grid-cols-4 gap-[6px] sm:grid-cols-6 sm:gap-[8px]">
              {data.visiblePosts.map((post, idx) => (
                <PostThumb key={`${post.date}-${idx}`} post={post} />
              ))}
            </ul>
          </div>
        ) : null}

        <ObservationBlock statements={observations} />
        <ReadingBlock
          hypothesis={reading.hypothesis}
          confidence={reading.confidence}
        />
      </div>
    </ReportBand>
  );
}
