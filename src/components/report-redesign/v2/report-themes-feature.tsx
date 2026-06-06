import { Hash, Quote, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ReportSourceLabel } from "./report-source-label";
import { ReportCardSectionHeader } from "./report-card-section-header";

import { cn } from "@/lib/utils";
import type { ThemesResult } from "@/lib/report/block02-diagnostic";

interface Props {
  themes: ThemesResult;
}

/**
 * Pergunta 04 · Temas das legendas — bloco isolado, full-width.
 *
 * Diferencia-se visualmente dos cards 1/3 das outras perguntas para que
 * o leitor perceba que é uma análise temática, baseada explicitamente
 * no texto das legendas (não nas hashtags).
 *
 * Comportamento:
 *  - Quando `themes.source === "ai"`: layout split — lista determinística
 *    à esquerda (se existir) ou apenas a interpretação IA à direita.
 *  - Quando `themes.source === "deterministic"`: lista de até 6 temas em
 *    duas colunas com barra proporcional e contagem mono.
 *  - Empty state explícito quando `available=false`.
 */
export function ReportThemesFeature({ themes }: Props) {
  const { t } = useTranslation("report");
  if (!themes.available) {
    return (
      <ThemesShell>
        <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
          {t("themes.empty")}
        </p>
      </ThemesShell>
    );
  }

  const isAi = themes.source === "ai" && !!themes.aiText;
  const items = (themes.items ?? []).slice(0, 3);
  const totalPosts = items.reduce(
    (acc, it) => Math.max(acc, it.postsCount ?? 0),
    0,
  );

  return (
    <ThemesShell
      headline={themes.headline}
      sampleHint={
        totalPosts > 0
          ? t("themes.sample", { count: totalPosts })
          : t("themes.sample_default")
      }
    >
      <div
        className={cn(
          "grid grid-cols-1 gap-6 md:gap-8",
          isAi && items.length > 0 ? "md:grid-cols-5" : "md:grid-cols-1",
        )}
      >
        {items.length > 0 ? (
          <div className={cn(isAi ? "md:col-span-3" : "md:col-span-1")}>
            <ThemesRanking items={items} />
          </div>
        ) : null}

        {isAi && themes.aiText ? (
          <aside
            className={cn(
              "md:col-span-2 rounded-xl bg-blue-50/50 ring-1 ring-blue-100",
              "p-5 md:p-6 flex flex-col gap-2.5 self-start",
            )}
          >
            <div className="inline-flex items-center gap-2">
              <ReportSourceLabel type="ia" />
              <span className="text-eyebrow-sm text-slate-500">{t("themes.interpretation")}</span>
            </div>
            <p className="text-[14px] text-slate-700 leading-relaxed italic">
              <Quote
                aria-hidden
                className="inline size-3.5 -mt-1 mr-1 text-blue-400"
              />
              {themes.aiText}
            </p>
          </aside>
        ) : null}
      </div>

      <p className="text-[12.5px] text-slate-500 leading-relaxed border-t border-slate-100 pt-4 mt-2">
        {t("themes.footer_note_part1")}{" "}
        <span className="inline-flex items-center gap-1 align-middle">
          <Hash aria-hidden className="size-3 text-slate-400" />
          {t("themes.footer_note_hashtags")}
        </span>{" "}
        {t("themes.footer_note_part2")}
      </p>
    </ThemesShell>
  );
}

function ThemesShell({
  headline,
  sampleHint,
  children,
}: {
  headline?: string;
  sampleHint?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("report");
  return (
    <section
      aria-label={t("themes.aria")}
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white",
        "p-7 md:p-9",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.08)]",
        "flex flex-col gap-6",
      )}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-2 min-w-0">
          <ReportCardSectionHeader
            eyebrow={
              <>
                <Sparkles aria-hidden className="size-3 text-content-tertiary" />
                {t("themes.eyebrow")}
              </>
            }
            title={t("themes.title")}
            bottomMargin={false}
          />
        </div>
        <span
          className={cn(
            "self-start inline-flex items-center rounded-full px-2.5 py-1",
            "text-eyebrow-sm ring-1",
            "bg-slate-50 text-slate-600 ring-slate-200",
          )}
        >
          {sampleHint ?? t("themes.sample_default")}
        </span>
      </header>

      {headline ? (
        <p className="font-display text-[1.05rem] md:text-[1.15rem] font-semibold tracking-tight text-blue-800">
          {headline}
        </p>
      ) : null}

      {children}
    </section>
  );
}

function ThemesRanking({
  items,
}: {
  items: ReadonlyArray<{
    text: string;
    weight: number;
    postsCount: number;
    snippets: string[];
  }>;
}) {
  const { t } = useTranslation("report");
  const max = Math.max(1, ...items.map((it) => it.weight));
  return (
    <ol className="flex flex-col divide-y divide-slate-100">
      {items.map((it, idx) => {
        const pct = Math.max(8, (it.weight / max) * 100);
        const rank = String(idx + 1).padStart(2, "0");
        return (
          <li
            key={it.text}
            className={cn(
              "min-w-0 py-4 first:pt-0 last:pb-0 flex flex-col gap-2.5",
            )}
          >
            <div className="flex items-baseline gap-3 min-w-0">
              <span className="tabular-nums text-xs tabular-nums text-slate-400 shrink-0">
                {rank}
              </span>
              <span className="text-[15px] md:text-[16px] font-semibold text-slate-900 truncate">
                {it.text}
              </span>
              <span className="ml-auto tabular-nums text-xs tabular-nums text-slate-500 shrink-0">
                {it.weight}×
                {it.postsCount > 0 ? (
                  <span className="text-slate-400">
                    {" · "}
                    {t("themes.post", { count: it.postsCount })}
                  </span>
                ) : null}
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {it.snippets.length > 0 ? (
              <ul className="flex flex-col gap-1 pl-6">
                {it.snippets.map((sn, snIdx) => (
                  <li
                    key={snIdx}
                    className="text-[13px] text-slate-600 italic leading-relaxed"
                  >
                    {sn}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}