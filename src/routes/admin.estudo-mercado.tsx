/**
 * /admin/estudo-mercado — agregador de feedback dos leitores.
 *
 * Três separadores:
 *   1. Pulso — KPI cards (média emojis, n modal, taxa resposta, intenção)
 *   2. Por bloco — média + distribuição por bloco do relatório (1–5)
 *   3. Modal beta — usefulness, intenção compra, pricing, comentários
 *
 * Cada separador abre com um "sinal editorial" determinístico que traduz
 * os números em informação prática (regras simples, sem IA).
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { AdminCard } from "@/components/admin/v2/admin-card";
import {
  getMarketStudyPulse,
  getMarketStudyBlocks,
  getMarketStudyModal,
  getPricingInterest,
} from "@/server/admin/market-study.functions";

type WindowDays = 7 | 30 | 90;

const TABS = [
  { id: "pulse", label: "Pulso do produto" },
  { id: "blocks", label: "Emojis por bloco" },
  { id: "modal", label: "Modal beta" },
  { id: "interest", label: "Intenção de compra" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const BLOCK_LABEL: Record<string, string> = {
  overview: "Visão geral",
  diagnostic: "Diagnóstico",
  performance: "Performance",
  content: "Conteúdo",
};

const INTENT_LABEL: Record<string, string> = {
  yes: "Sim",
  maybe: "Talvez",
  no: "Não",
  unsure: "Indeciso",
};

export const Route = createFileRoute("/admin/estudo-mercado")({
  component: EstudoMercadoPage,
});

function EstudoMercadoPage() {
  const [tab, setTab] = useState<TabId>("pulse");
  const [windowDays, setWindowDays] = useState<WindowDays>(30);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Estudo de mercado"
        subtitle="Como os leitores estão a reagir ao produto, com base nas respostas inline e no modal de validação beta."
        actions={
          <div className="flex items-center gap-1.5 rounded-md border border-admin-border bg-white px-1 py-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setWindowDays(d as WindowDays)}
                className={`rounded px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  windowDays === d
                    ? "bg-admin-surface-elevated text-admin-text-primary"
                    : "text-admin-text-secondary hover:text-admin-text-primary"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />

      <div
        className="flex gap-1 border-b"
        style={{ borderColor: "rgb(var(--admin-border) / 0.5)" }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-admin-text-primary text-admin-text-primary"
                : "border-transparent text-admin-text-secondary hover:text-admin-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pulse" && <PulseTab windowDays={windowDays} />}
      {tab === "blocks" && <BlocksTab windowDays={windowDays} />}
      {tab === "modal" && <ModalTab windowDays={windowDays} />}
      {tab === "interest" && <InterestTab windowDays={windowDays} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Reusables                                                                 */
/* -------------------------------------------------------------------------- */

function SignalCard({
  tone,
  title,
  body,
}: {
  tone: "positive" | "neutral" | "warning";
  title: string;
  body: string;
}) {
  const colour =
    tone === "positive"
      ? "#1D9E75"
      : tone === "warning"
        ? "#BA7517"
        : "#378ADD";
  return (
    <div
      className="rounded-lg border bg-white px-4 py-3 flex items-start gap-3"
      style={{ borderColor: `${colour}40`, background: `${colour}0d` }}
    >
      <div
        className="mt-1 h-2 w-2 rounded-full shrink-0"
        style={{ background: colour }}
      />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-admin-text-secondary">
          {title}
        </div>
        <p className="m-0 text-[13px] leading-snug text-admin-text-primary">
          {body}
        </p>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-admin-border bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide font-semibold text-admin-text-secondary">
        {label}
      </div>
      <div className="mt-1 text-[24px] font-semibold tabular-nums text-admin-text-primary leading-none">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-[12px] text-admin-text-secondary">{hint}</div>
      ) : null}
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-admin-border bg-white px-4 py-6 text-center text-[13px] text-admin-text-secondary">
      {children}
    </div>
  );
}

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}
function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${Math.round(n * 100)}%`;
}
function fmtDelta(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  const sign = n > 0 ? "+" : "";
  return ` (${sign}${n.toFixed(2)} vs período anterior)`;
}

/* -------------------------------------------------------------------------- */
/*  Pulse                                                                     */
/* -------------------------------------------------------------------------- */

function PulseTab({ windowDays }: { windowDays: WindowDays }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "market-study", "pulse", windowDays],
    queryFn: () => getMarketStudyPulse({ data: { windowDays } }),
  });

  if (isLoading || !data) {
    return <EmptyState>A carregar pulso…</EmptyState>;
  }

  const { inline, modal, recentFreeText } = data;
  const signal = derivePulseSignal(inline, modal);

  return (
    <div className="space-y-5">
      <SignalCard tone={signal.tone} title="Sinal editorial" body={signal.text} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Pulso emojis (1–5)"
          value={fmtNum(inline.avg, 2)}
          hint={`${inline.n} respostas${fmtDelta(inline.delta)}`}
        />
        <StatTile
          label="Respostas modal"
          value={String(modal.n)}
          hint={
            modal.responseRate !== null
              ? `${fmtPct(modal.responseRate)} dos ${modal.reportsTotal} relatórios`
              : "Sem relatórios no período"
          }
        />
        <StatTile
          label="Intenção sim/talvez"
          value={
            modal.n > 0
              ? fmtPct(
                  ((modal.intentCounts.yes ?? 0) + (modal.intentCounts.maybe ?? 0)) /
                    modal.n,
                )
              : "—"
          }
          hint={`Sim ${modal.intentCounts.yes ?? 0} · Talvez ${modal.intentCounts.maybe ?? 0} · Não ${modal.intentCounts.no ?? 0}`}
        />
        <StatTile
          label="Janela"
          value={`${windowDays}d`}
          hint="Período em análise"
        />
      </div>

      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
          Comentários recentes (livres)
        </h3>
        {recentFreeText.length === 0 ? (
          <EmptyState>Sem respostas livres no período.</EmptyState>
        ) : (
          <ul className="m-0 space-y-2 list-none p-0">
            {recentFreeText.map((t, i) => (
              <li
                key={i}
                className="rounded-md border border-admin-border bg-admin-surface-elevated px-3 py-2 text-[13px] text-admin-text-primary leading-snug"
              >
                {t}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}

function derivePulseSignal(
  inline: { n: number; avg: number | null; delta: number | null },
  modal: { n: number; intentCounts: Record<string, number> },
): { tone: "positive" | "neutral" | "warning"; text: string } {
  if (inline.n < 5 && modal.n < 3) {
    return {
      tone: "neutral",
      text: "Amostra ainda pequena. Aguardar mais respostas antes de tirar conclusões.",
    };
  }
  if (inline.avg !== null && inline.avg >= 4.2 && inline.n >= 10) {
    return {
      tone: "positive",
      text: "Pulso elevado e amostra suficiente — os leitores estão a validar o produto.",
    };
  }
  if (inline.avg !== null && inline.avg < 3.2 && inline.n >= 10) {
    return {
      tone: "warning",
      text: "Pulso baixo — vale a pena revisitar os blocos com pior média antes de ampliar tráfego.",
    };
  }
  const positiveIntent =
    ((modal.intentCounts.yes ?? 0) + (modal.intentCounts.maybe ?? 0)) /
    Math.max(modal.n, 1);
  if (modal.n >= 5 && positiveIntent >= 0.4) {
    return {
      tone: "positive",
      text: "Intenção de compra agregada acima de 40% — sinal de validação comercial.",
    };
  }
  return {
    tone: "neutral",
    text: "Sinal misto. Continuar a recolher respostas para consolidar tendência.",
  };
}

/* -------------------------------------------------------------------------- */
/*  Blocks                                                                    */
/* -------------------------------------------------------------------------- */

function BlocksTab({ windowDays }: { windowDays: WindowDays }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "market-study", "blocks", windowDays],
    queryFn: () => getMarketStudyBlocks({ data: { windowDays } }),
  });

  if (isLoading || !data) {
    return <EmptyState>A carregar dados por bloco…</EmptyState>;
  }

  const { byBlock, comments } = data;
  const totalN = byBlock.reduce((acc, b) => acc + b.n, 0);
  const worst = byBlock
    .filter((b) => b.n >= 5 && b.avg !== null)
    .sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))[0];
  const best = byBlock
    .filter((b) => b.n >= 5 && b.avg !== null)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0];

  const signal: { tone: "positive" | "neutral" | "warning"; text: string } =
    totalN < 5
      ? { tone: "neutral", text: "Sem amostra suficiente para comparar blocos." }
      : worst && (worst.avg ?? 5) < 3.5
        ? {
            tone: "warning",
            text: `Bloco "${BLOCK_LABEL[worst.block] ?? worst.block}" com média ${fmtNum(worst.avg, 2)} — ponto crítico a iterar primeiro.`,
          }
        : best && (best.avg ?? 0) >= 4.2
          ? {
              tone: "positive",
              text: `Bloco "${BLOCK_LABEL[best.block] ?? best.block}" lidera com média ${fmtNum(best.avg, 2)} — referência editorial a replicar.`,
            }
          : {
              tone: "neutral",
              text: "Blocos com médias semelhantes — nenhum se destaca claramente.",
            };

  return (
    <div className="space-y-5">
      <SignalCard tone={signal.tone} title="Sinal editorial" body={signal.text} />

      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
          Por bloco
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-admin-text-secondary">
                <th className="font-medium pb-2 pr-3">Bloco</th>
                <th className="font-medium pb-2 pr-3 tabular-nums">N</th>
                <th className="font-medium pb-2 pr-3 tabular-nums">Média</th>
                <th className="font-medium pb-2 pr-3 tabular-nums">% positivas</th>
                <th className="font-medium pb-2 pr-3">Distribuição</th>
              </tr>
            </thead>
            <tbody>
              {byBlock.map((b) => (
                <tr
                  key={b.block}
                  className="border-t"
                  style={{ borderColor: "rgb(var(--admin-border) / 0.4)" }}
                >
                  <td className="py-2 pr-3 text-admin-text-primary font-medium">
                    {BLOCK_LABEL[b.block] ?? b.block}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-admin-text-primary">{b.n}</td>
                  <td className="py-2 pr-3 tabular-nums text-admin-text-primary">
                    {fmtNum(b.avg, 2)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-admin-text-primary">
                    {fmtPct(b.positiveRate)}
                  </td>
                  <td className="py-2 pr-3">
                    <DistributionBar dist={b.distribution} total={b.n} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
          Últimos comentários inline ({comments.length})
        </h3>
        {comments.length === 0 ? (
          <EmptyState>Sem comentários livres registados.</EmptyState>
        ) : (
          <ul className="m-0 space-y-2 list-none p-0">
            {comments.map((c, i) => (
              <li
                key={i}
                className="rounded-md border border-admin-border bg-admin-surface-elevated px-3 py-2 text-[13px]"
              >
                <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wide text-admin-text-secondary">
                  <span className="font-semibold tabular-nums">{c.rating}/5</span>
                  <span>·</span>
                  <span>{BLOCK_LABEL[c.block] ?? c.block}</span>
                  {c.handle ? (
                    <>
                      <span>·</span>
                      <Link
                        to="/analyze/$username"
                        params={{ username: c.handle }}
                        className="text-admin-text-secondary hover:text-admin-text-primary"
                      >
                        @{c.handle}
                      </Link>
                    </>
                  ) : null}
                  <span>·</span>
                  <span>{new Date(c.createdAt).toLocaleDateString("pt-PT")}</span>
                </div>
                <p className="m-0 leading-snug text-admin-text-primary">{c.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}

function DistributionBar({
  dist,
  total,
}: {
  dist: Record<1 | 2 | 3 | 4 | 5, number>;
  total: number;
}) {
  if (total === 0) return <span className="text-admin-text-secondary">—</span>;
  const colours: Record<1 | 2 | 3 | 4 | 5, string> = {
    1: "#E24B4A",
    2: "#BA7517",
    3: "#888780",
    4: "#378ADD",
    5: "#1D9E75",
  };
  return (
    <div className="flex h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-admin-surface-elevated">
      {([1, 2, 3, 4, 5] as const).map((k) => {
        const pct = (dist[k] / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={k}
            style={{ width: `${pct}%`, background: colours[k] }}
            title={`${k}/5 — ${dist[k]} resposta${dist[k] === 1 ? "" : "s"}`}
          />
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modal                                                                     */
/* -------------------------------------------------------------------------- */

function ModalTab({ windowDays }: { windowDays: WindowDays }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "market-study", "modal", windowDays],
    queryFn: () => getMarketStudyModal({ data: { windowDays } }),
  });

  if (isLoading || !data) {
    return <EmptyState>A carregar respostas do modal…</EmptyState>;
  }

  const { n, usefulness, intentCounts, pricingCounts, consent, freeText } = data;

  const positiveIntent =
    n > 0
      ? ((intentCounts.yes ?? 0) + (intentCounts.maybe ?? 0)) / n
      : null;

  const signal: { tone: "positive" | "neutral" | "warning"; text: string } =
    n < 3
      ? { tone: "neutral", text: "Modal com poucas respostas — não tirar conclusões ainda." }
      : positiveIntent !== null && positiveIntent >= 0.5
        ? {
            tone: "positive",
            text: `${fmtPct(positiveIntent)} dos respondentes diz sim ou talvez. Sinal forte de validação comercial.`,
          }
        : usefulness.avg !== null && usefulness.avg < 3
          ? {
              tone: "warning",
              text: `Utilidade média ${fmtNum(usefulness.avg, 2)} — produto ainda não está a entregar valor percebido suficiente.`,
            }
          : {
              tone: "neutral",
              text: "Sinal misto no modal — vale a pena cruzar com os blocos com pior pontuação.",
            };

  return (
    <div className="space-y-5">
      <SignalCard tone={signal.tone} title="Sinal editorial" body={signal.text} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Utilidade média"
          value={fmtNum(usefulness.avg, 2)}
          hint={`${n} respostas no período`}
        />
        <StatTile
          label="Intenção sim/talvez"
          value={fmtPct(positiveIntent)}
          hint={`Não ${intentCounts.no ?? 0} · Indeciso ${intentCounts.unsure ?? 0}`}
        />
        <StatTile
          label="Opt-in contacto"
          value={fmtPct(consent.rate)}
          hint={`${consent.total} pessoas aceitaram follow-up`}
        />
        <StatTile label="Janela" value={`${windowDays}d`} hint="Período em análise" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard>
          <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
            Intenção de compra
          </h3>
          <CountList counts={intentCounts} total={n} labelMap={INTENT_LABEL} />
        </AdminCard>
        <AdminCard>
          <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
            Preferência de pricing
          </h3>
          <CountList counts={pricingCounts} total={n} />
        </AdminCard>
      </div>

      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
          Respostas livres ({freeText.length})
        </h3>
        {freeText.length === 0 ? (
          <EmptyState>Sem respostas livres no período.</EmptyState>
        ) : (
          <ul className="m-0 space-y-2 list-none p-0">
            {freeText.map((r) => (
              <li
                key={r.id}
                className="rounded-md border border-admin-border bg-admin-surface-elevated px-3 py-2 text-[13px]"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1 text-[11px] uppercase tracking-wide text-admin-text-secondary">
                  <span className="font-semibold tabular-nums">{r.score}/5</span>
                  {r.intent ? (
                    <>
                      <span>·</span>
                      <span>{INTENT_LABEL[r.intent] ?? r.intent}</span>
                    </>
                  ) : null}
                  <span>·</span>
                  <span>{new Date(r.createdAt).toLocaleDateString("pt-PT")}</span>
                </div>
                {r.clarity ? (
                  <p className="m-0 mb-1 leading-snug text-admin-text-primary">
                    <span className="text-admin-text-secondary">Claro: </span>
                    {r.clarity}
                  </p>
                ) : null}
                {r.missing ? (
                  <p className="m-0 leading-snug text-admin-text-primary">
                    <span className="text-admin-text-secondary">Em falta: </span>
                    {r.missing}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}

function CountList({
  counts,
  total,
  labelMap,
}: {
  counts: Record<string, number>;
  total: number;
  labelMap?: Record<string, string>;
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <EmptyState>Sem dados.</EmptyState>;
  }
  return (
    <ul className="m-0 list-none p-0 space-y-2">
      {entries.map(([k, v]) => {
        const pct = total > 0 ? v / total : 0;
        return (
          <li key={k} className="flex items-center gap-3 text-[13px]">
            <span className="min-w-[110px] text-admin-text-primary">
              {labelMap?.[k] ?? k}
            </span>
            <div className="flex-1 h-2 rounded-full bg-admin-surface-elevated overflow-hidden">
              <div
                className="h-full"
                style={{ width: `${pct * 100}%`, background: "#378ADD" }}
              />
            </div>
            <span className="tabular-nums text-admin-text-secondary min-w-[64px] text-right">
              {v} · {fmtPct(pct)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pricing interest                                                          */
/* -------------------------------------------------------------------------- */

const PRICING_OPTION_LABEL: Record<string, string> = {
  single_report: "1 relatório · 7€",
  pack_5_reports: "Pack 5 · 28€",
};
const WOULD_PAY_LABEL: Record<string, string> = {
  sim: "Sim, pagaria",
  talvez: "Talvez, depende",
  nao: "Não, ainda não",
};
const FAIRNESS_LABEL: Record<string, string> = {
  barato: "Barato",
  justo: "Justo",
  caro: "Caro",
};

function InterestTab({ windowDays }: { windowDays: WindowDays }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "market-study", "interest", windowDays],
    queryFn: () => getPricingInterest({ data: { windowDays } }),
  });

  if (isLoading || !data) {
    return <EmptyState>A carregar intenção de compra…</EmptyState>;
  }

  const {
    n,
    wouldPayCounts,
    optionCounts,
    fairnessByOption,
    positiveRate,
    convictionRate,
    emailsCount,
    comments,
  } = data;

  const signal: { tone: "positive" | "neutral" | "warning"; text: string } =
    n < 5
      ? {
          tone: "neutral",
          text: "Amostra ainda pequena. Aguardar mais respostas antes de validar o preço.",
        }
      : positiveRate !== null && positiveRate >= 0.6 && n >= 20
        ? {
            tone: "positive",
            text: `${fmtPct(positiveRate)} dos respondentes diz sim ou talvez em ${n} respostas — preço validado.`,
          }
        : convictionRate !== null && convictionRate >= 0.3 && n >= 10
          ? {
              tone: "positive",
              text: `${fmtPct(convictionRate)} de "sim convicto" em ${n} respostas — sinal forte de intenção.`,
            }
          : positiveRate !== null && positiveRate < 0.3 && n >= 10
            ? {
                tone: "warning",
                text: `Apenas ${fmtPct(positiveRate)} positivos — o preço atual pode estar acima do percebido.`,
              }
            : {
                tone: "neutral",
                text: "Sinal misto — continuar a recolher respostas para consolidar tendência.",
              };

  return (
    <div className="space-y-5">
      <SignalCard tone={signal.tone} title="Sinal editorial" body={signal.text} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Respostas"
          value={String(n)}
          hint={`Single ${optionCounts.single_report} · Pack ${optionCounts.pack_5_reports}`}
        />
        <StatTile
          label="% sim + talvez"
          value={fmtPct(positiveRate)}
          hint={`Sim ${wouldPayCounts.sim} · Talvez ${wouldPayCounts.talvez} · Não ${wouldPayCounts.nao}`}
        />
        <StatTile
          label="% sim convicto"
          value={fmtPct(convictionRate)}
          hint="Sinal mais forte de compra"
        />
        <StatTile
          label="Emails deixados"
          value={String(emailsCount)}
          hint="Lista de espera potencial"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard>
          <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
            Intenção de pagar
          </h3>
          <CountList
            counts={wouldPayCounts as unknown as Record<string, number>}
            total={n}
            labelMap={WOULD_PAY_LABEL}
          />
        </AdminCard>
        <AdminCard>
          <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
            Perceção do preço por plano
          </h3>
          {(Object.keys(fairnessByOption) as Array<keyof typeof fairnessByOption>).map(
            (opt) => {
              const total = optionCounts[opt];
              return (
                <div key={opt} className="mb-3 last:mb-0">
                  <div className="mb-1.5 text-[11px] uppercase tracking-wide font-semibold text-admin-text-secondary">
                    {PRICING_OPTION_LABEL[opt] ?? opt} ({total})
                  </div>
                  <CountList
                    counts={fairnessByOption[opt] as unknown as Record<string, number>}
                    total={total}
                    labelMap={FAIRNESS_LABEL}
                  />
                </div>
              );
            },
          )}
        </AdminCard>
      </div>

      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
          Comentários ({comments.length})
        </h3>
        {comments.length === 0 ? (
          <EmptyState>Sem comentários no período.</EmptyState>
        ) : (
          <ul className="m-0 space-y-2 list-none p-0">
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-admin-border bg-admin-surface-elevated px-3 py-2 text-[13px]"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1 text-[11px] uppercase tracking-wide text-admin-text-secondary">
                  <span>{PRICING_OPTION_LABEL[c.option] ?? c.option}</span>
                  <span>·</span>
                  <span>{WOULD_PAY_LABEL[c.wouldPay] ?? c.wouldPay}</span>
                  {c.fairness ? (
                    <>
                      <span>·</span>
                      <span>{FAIRNESS_LABEL[c.fairness] ?? c.fairness}</span>
                    </>
                  ) : null}
                  {c.email ? (
                    <>
                      <span>·</span>
                      <span className="normal-case tracking-normal text-admin-text-primary">
                        {c.email}
                      </span>
                    </>
                  ) : null}
                  <span>·</span>
                  <span>{new Date(c.createdAt).toLocaleDateString("pt-PT")}</span>
                </div>
                <p className="m-0 leading-snug text-admin-text-primary">{c.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}