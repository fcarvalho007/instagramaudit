/**
 * /admin/estudo-mercado — agregador visual de feedback dos leitores.
 * Reformulado para mostrar autor + hora, ranking de votos visual,
 * heatmap por bloco e séries temporais nos modais.
 */

import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { AdminCard } from "@/components/admin/v2/admin-card";
import {
  CommentMural, type MuralComment,
} from "@/components/admin/v2/estudo-mercado/comment-mural";
import { RatingRanking } from "@/components/admin/v2/estudo-mercado/rating-ranking";
import { BlockHeatmap } from "@/components/admin/v2/estudo-mercado/block-heatmap";
import { chartPalette, intentColor } from "@/components/admin/v2/estudo-mercado/chart-palette";
import { ChartTooltip } from "@/components/admin/v2/estudo-mercado/chart-tooltip";
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

const INTENT_LABEL: Record<string, string> = {
  yes: "Sim", maybe: "Talvez", no: "Não", unsure: "Indeciso",
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

      <div className="flex gap-1 border-b" style={{ borderColor: "rgb(var(--admin-border) / 0.5)" }}>
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

/* ───────────────────────── reusables ───────────────────────── */

function SignalCard({ tone, title, body }: {
  tone: "positive" | "neutral" | "warning"; title: string; body: string;
}) {
  const colour =
    tone === "positive" ? chartPalette.positive
    : tone === "warning" ? chartPalette.warning
    : chartPalette.accentPrimary;
  return (
    <div className="rounded-lg border bg-white px-4 py-3 flex items-start gap-3"
      style={{ borderColor: `${colour}40`, background: `${colour}0d` }}>
      <div className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ background: colour }} />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-admin-text-secondary">{title}</div>
        <p className="m-0 text-[13px] leading-snug text-admin-text-primary">{body}</p>
      </div>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-admin-border bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide font-semibold text-admin-text-secondary">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tabular-nums text-admin-text-primary leading-none">{value}</div>
      {hint ? <div className="mt-1 text-[12px] text-admin-text-secondary">{hint}</div> : null}
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-admin-border bg-white px-4 py-6 text-center text-[13px] text-admin-text-secondary">
      {children}
    </div>
  );
}

const fmtNum = (n: number | null | undefined, d = 2) =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : n.toFixed(d);
const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : `${Math.round(n * 100)}%`;
const fmtDelta = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "" : ` (${n > 0 ? "+" : ""}${n.toFixed(2)} vs anterior)`;
const fmtDay = (iso: string) => iso.slice(5).replace("-", "/");

/* ───────────────────────── Pulse ───────────────────────── */

function PulseTab({ windowDays }: { windowDays: WindowDays }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "market-study", "pulse", windowDays],
    queryFn: () => getMarketStudyPulse({ data: { windowDays } }),
  });
  if (isLoading || !data) return <Empty>A carregar pulso…</Empty>;

  const { inline, modal, comments, topics } = data;
  const positiveIntent = modal.n > 0
    ? ((modal.intentCounts.yes ?? 0) + (modal.intentCounts.maybe ?? 0)) / modal.n
    : null;
  const signal = derivePulseSignal(inline, modal);

  return (
    <div className="space-y-5">
      <SignalCard tone={signal.tone} title="Sinal editorial" body={signal.text} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Pulso emojis (1–5)" value={fmtNum(inline.avg, 2)}
          hint={`${inline.n} respostas${fmtDelta(inline.delta)}`} />
        <StatTile label="Respostas modal" value={String(modal.n)}
          hint={modal.responseRate !== null
            ? `${fmtPct(modal.responseRate)} dos ${modal.reportsTotal} relatórios`
            : "Sem relatórios no período"} />
        <StatTile label="Intenção sim/talvez" value={fmtPct(positiveIntent)}
          hint={`Sim ${modal.intentCounts.yes ?? 0} · Talvez ${modal.intentCounts.maybe ?? 0} · Não ${modal.intentCounts.no ?? 0}`} />
        <StatTile label="Comentários" value={String(comments.length)}
          hint={`Janela ${windowDays}d`} />
      </div>

      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">3 sinais principais</h3>
        {topics.length === 0 ? (
          <Empty>Amostra ainda pequena para extrair tópicos recorrentes.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <span key={t.token}
                className="inline-flex items-center gap-2 rounded-full border border-admin-border bg-admin-surface-elevated px-3 py-1 text-[13px] text-admin-text-primary">
                <span className="font-medium">{t.token}</span>
                <span className="text-admin-text-secondary tabular-nums">×{t.count}</span>
              </span>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
          Mural de comentários
        </h3>
        <CommentMural comments={comments as MuralComment[]} />
      </AdminCard>
    </div>
  );
}

function derivePulseSignal(
  inline: { n: number; avg: number | null; delta: number | null },
  modal: { n: number; intentCounts: Record<string, number> },
): { tone: "positive" | "neutral" | "warning"; text: string } {
  if (inline.n < 5 && modal.n < 3) {
    return { tone: "neutral", text: "Amostra ainda pequena. Aguardar mais respostas antes de tirar conclusões." };
  }
  if (inline.avg !== null && inline.avg >= 4.2 && inline.n >= 10) {
    return { tone: "positive", text: "Pulso elevado e amostra suficiente — os leitores estão a validar o produto." };
  }
  if (inline.avg !== null && inline.avg < 3.2 && inline.n >= 10) {
    return { tone: "warning", text: "Pulso baixo — vale a pena revisitar os blocos com pior média." };
  }
  return { tone: "neutral", text: "Sinal misto. Continuar a recolher respostas." };
}

/* ───────────────────────── Blocks ───────────────────────── */

function BlocksTab({ windowDays }: { windowDays: WindowDays }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "market-study", "blocks", windowDays],
    queryFn: () => getMarketStudyBlocks({ data: { windowDays } }),
  });
  if (isLoading || !data) return <Empty>A carregar dados por bloco…</Empty>;

  const { ratingTotals, ratingDaily, heatmap, comments } = data;
  const muralComments: MuralComment[] = useMemo(
    () => comments.map((c) => ({
      id: `inline-block:${c.snapshotId ?? ""}:${c.createdAt}`,
      source: "inline" as const,
      text: c.comment,
      rating: c.rating,
      block: c.block,
      intent: null,
      authorEmail: null,
      authorName: c.handle ? `@${c.handle}` : null,
      language: "other" as const,
      createdAt: c.createdAt,
      handle: c.handle ?? null,
    })),
    [comments],
  );

  return (
    <div className="space-y-5">
      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
          Ranking de votos no período
        </h3>
        <RatingRanking totals={ratingTotals} daily={ratingDaily} />
      </AdminCard>

      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
          Mapa de calor · bloco × emoji
        </h3>
        <BlockHeatmap rows={heatmap} />
      </AdminCard>

      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
          Comentários inline ({comments.length})
        </h3>
        <CommentMural comments={muralComments} showSourceFilter={false} />
      </AdminCard>
    </div>
  );
}

/* ───────────────────────── Modal ───────────────────────── */

function ModalTab({ windowDays }: { windowDays: WindowDays }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "market-study", "modal", windowDays],
    queryFn: () => getMarketStudyModal({ data: { windowDays } }),
  });
  if (isLoading || !data) return <Empty>A carregar respostas do modal…</Empty>;

  const { n, usefulness, intentCounts, consent, freeText, daily } = data;
  const positiveIntent = n > 0
    ? ((intentCounts.yes ?? 0) + (intentCounts.maybe ?? 0)) / n
    : null;

  const muralComments: MuralComment[] = freeText.map((r) => ({
    id: `beta:${r.id}`,
    source: "beta" as const,
    text: [r.clarity, r.missing].filter((x): x is string => !!x).join(" — "),
    rating: r.score ?? null,
    block: null,
    intent: r.intent ?? null,
    authorEmail: r.authorEmail,
    authorName: r.authorName,
    language: "other" as const,
    createdAt: r.createdAt,
    handle: null,
  }));

  const dailyChart = daily.map((d) => ({
    day: fmtDay(d.day),
    Sim: d.yes, Talvez: d.maybe, Não: d.no, Indeciso: d.unsure,
    util: d.avgUsefulness,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Utilidade média" value={fmtNum(usefulness.avg, 2)} hint={`${n} respostas`} />
        <StatTile label="Intenção sim/talvez" value={fmtPct(positiveIntent)}
          hint={`Não ${intentCounts.no ?? 0} · Indeciso ${intentCounts.unsure ?? 0}`} />
        <StatTile label="Opt-in contacto" value={fmtPct(consent.rate)}
          hint={`${consent.total} aceitaram follow-up`} />
        <StatTile label="Janela" value={`${windowDays}d`} hint="Período em análise" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard>
          <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
            Respostas por dia (intenção)
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--admin-border) / 0.5)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Sim" stackId="a" fill="#1D9E75" />
                <Bar dataKey="Talvez" stackId="a" fill="#3772E5" />
                <Bar dataKey="Não" stackId="a" fill="#E24B4A" />
                <Bar dataKey="Indeciso" stackId="a" fill="#888780" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard>
          <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
            Utilidade média por dia
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChart} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--admin-border) / 0.5)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="util" stroke="#7664E4" strokeWidth={2}
                  dot={{ r: 3 }} name="Utilidade" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
          Respostas livres ({freeText.length})
        </h3>
        <CommentMural comments={muralComments} showSourceFilter={false} />
      </AdminCard>
    </div>
  );
}

/* ───────────────────────── Pricing ───────────────────────── */

const PRICING_OPTION_LABEL: Record<string, string> = {
  single_report: "1 relatório · 7€",
  pack_5_reports: "Pack 5 · 28€",
};
const WOULD_PAY_LABEL: Record<string, string> = {
  sim: "Sim, pagaria", talvez: "Talvez, depende", nao: "Não, ainda não",
};
const FAIRNESS_LABEL: Record<string, string> = { barato: "Barato", justo: "Justo", caro: "Caro" };

function InterestTab({ windowDays }: { windowDays: WindowDays }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "market-study", "interest", windowDays],
    queryFn: () => getPricingInterest({ data: { windowDays } }),
  });
  if (isLoading || !data) return <Empty>A carregar intenção de compra…</Empty>;

  const {
    n, wouldPayCounts, optionCounts, fairnessByOption,
    positiveRate, convictionRate, emailsCount, comments, daily,
  } = data;

  const dailyChart = daily.map((d) => ({
    day: fmtDay(d.day),
    Sim: d.sim, Talvez: d.talvez, Não: d.nao,
    conviction: d.convictionRate !== null ? Math.round(d.convictionRate * 100) : null,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Respostas" value={String(n)}
          hint={`Single ${optionCounts.single_report} · Pack ${optionCounts.pack_5_reports}`} />
        <StatTile label="% sim + talvez" value={fmtPct(positiveRate)}
          hint={`Sim ${wouldPayCounts.sim} · Talvez ${wouldPayCounts.talvez} · Não ${wouldPayCounts.nao}`} />
        <StatTile label="% sim convicto" value={fmtPct(convictionRate)} hint="Sinal mais forte" />
        <StatTile label="Emails deixados" value={String(emailsCount)} hint="Lista de espera" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard>
          <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
            Respostas por dia
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChart} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--admin-border) / 0.5)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Sim" stackId="a" fill="#1D9E75" />
                <Bar dataKey="Talvez" stackId="a" fill="#3772E5" />
                <Bar dataKey="Não" stackId="a" fill="#E24B4A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard>
          <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
            % sim convicto por dia
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChart} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--admin-border) / 0.5)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip />
                <Line type="monotone" dataKey="conviction" stroke="#1D9E75" strokeWidth={2}
                  dot={{ r: 3 }} name="% convicto" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AdminCard>
          <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
            Intenção de pagar
          </h3>
          <SimpleBarList counts={wouldPayCounts as unknown as Record<string, number>}
            total={n} labelMap={WOULD_PAY_LABEL} />
        </AdminCard>
        <AdminCard>
          <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
            Perceção do preço por plano
          </h3>
          {(Object.keys(fairnessByOption) as Array<keyof typeof fairnessByOption>).map((opt) => (
            <div key={opt} className="mb-3 last:mb-0">
              <div className="mb-1.5 text-[11px] uppercase tracking-wide font-semibold text-admin-text-secondary">
                {PRICING_OPTION_LABEL[opt] ?? opt} ({optionCounts[opt]})
              </div>
              <SimpleBarList
                counts={fairnessByOption[opt] as unknown as Record<string, number>}
                total={optionCounts[opt]} labelMap={FAIRNESS_LABEL} />
            </div>
          ))}
        </AdminCard>
      </div>

      <AdminCard>
        <h3 className="m-0 mb-3 text-[14px] font-semibold text-admin-text-primary">
          Comentários ({comments.length})
        </h3>
        {comments.length === 0 ? (
          <Empty>Sem comentários no período.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-admin-text-secondary border-b" style={{ borderColor: "rgb(var(--admin-border) / 0.5)" }}>
                  <th className="py-2 pr-3 font-medium">Plano</th>
                  <th className="py-2 pr-3 font-medium">Pagaria</th>
                  <th className="py-2 pr-3 font-medium">Preço</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium tabular-nums">Data · Hora</th>
                  <th className="py-2 pr-3 font-medium">Comentário</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => {
                  const d = new Date(c.createdAt);
                  return (
                    <tr key={c.id} className="border-b" style={{ borderColor: "rgb(var(--admin-border) / 0.3)" }}>
                      <td className="py-2 pr-3 text-admin-text-primary">{PRICING_OPTION_LABEL[c.option] ?? c.option}</td>
                      <td className="py-2 pr-3 text-admin-text-primary">{WOULD_PAY_LABEL[c.wouldPay] ?? c.wouldPay}</td>
                      <td className="py-2 pr-3 text-admin-text-secondary">{c.fairness ? FAIRNESS_LABEL[c.fairness] : "—"}</td>
                      <td className="py-2 pr-3 text-admin-text-primary">{c.email ?? "—"}</td>
                      <td className="py-2 pr-3 text-admin-text-secondary tabular-nums whitespace-nowrap">
                        {d.toLocaleDateString("pt-PT")} · {d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2 pr-3 text-admin-text-primary">{c.comment}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

function SimpleBarList({ counts, total, labelMap }: {
  counts: Record<string, number>; total: number; labelMap?: Record<string, string>;
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0 || total === 0) return <Empty>Sem dados.</Empty>;
  return (
    <ul className="m-0 list-none p-0 space-y-2">
      {entries.map(([k, v]) => {
        const pct = total > 0 ? v / total : 0;
        return (
          <li key={k} className="flex items-center gap-3 text-[13px]">
            <span className="min-w-[110px] text-admin-text-primary">{labelMap?.[k] ?? k}</span>
            <div className="flex-1 h-2 rounded-full bg-admin-surface-elevated overflow-hidden">
              <div className="h-full" style={{ width: `${pct * 100}%`, background: "#3772E5" }} />
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
