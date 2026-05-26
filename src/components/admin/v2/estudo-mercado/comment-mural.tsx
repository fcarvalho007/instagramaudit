/**
 * Mural de comentários reutilizado nos vários tabs de /admin/estudo-mercado.
 * Mostra cada comentário com autor (email/nome), data + hora HH:mm,
 * origem (inline / modal beta / modal preços) e idioma detectado.
 * Permite filtrar por origem, idioma e pesquisa livre.
 */

import { useMemo, useState } from "react";
import type { Lang } from "@/lib/admin/lang-detect";
import { sourceColor as SOURCE_COLOR_MAP } from "./chart-palette";

export type MuralSource = "inline" | "beta" | "pricing";

export interface MuralComment {
  id: string;
  source: MuralSource;
  text: string;
  rating: number | null;
  block: string | null;
  intent: string | null;
  authorEmail: string | null;
  authorName: string | null;
  language: Lang;
  createdAt: string;
  handle?: string | null;
}

const SOURCE_LABEL: Record<MuralSource, string> = {
  inline: "Inline (relatório)",
  beta: "Modal beta",
  pricing: "Modal preços",
};
const SOURCE_COLOR: Record<MuralSource, string> = SOURCE_COLOR_MAP;
const LANG_LABEL: Record<Lang, string> = {
  pt: "PT",
  en: "EN",
  other: "—",
};
const BLOCK_LABEL: Record<string, string> = {
  overview: "Visão geral",
  diagnostic: "Diagnóstico",
  performance: "Performance",
  content: "Conteúdo",
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const time = d.toLocaleTimeString("pt-PT", {
    hour: "2-digit", minute: "2-digit",
  });
  return `${day} · ${time}`;
}

function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(rows: MuralComment[]): void {
  const header = [
    "created_at_iso", "source", "language", "author_email", "author_name",
    "handle", "block", "rating", "intent", "text",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      csvEscape(r.createdAt),
      csvEscape(r.source),
      csvEscape(r.language),
      csvEscape(r.authorEmail),
      csvEscape(r.authorName),
      csvEscape(r.handle ?? null),
      csvEscape(r.block),
      csvEscape(r.rating),
      csvEscape(r.intent),
      csvEscape(r.text),
    ].join(","));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comentarios-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CommentMural({
  comments,
  emptyText = "Sem comentários no período.",
  showSourceFilter = true,
}: {
  comments: MuralComment[];
  emptyText?: string;
  showSourceFilter?: boolean;
}) {
  const [source, setSource] = useState<MuralSource | "all">("all");
  const [lang, setLang] = useState<Lang | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return comments.filter((c) => {
      if (source !== "all" && c.source !== source) return false;
      if (lang !== "all" && c.language !== lang) return false;
      if (ql) {
        const blob = `${c.text} ${c.authorEmail ?? ""} ${c.authorName ?? ""}`.toLowerCase();
        if (!blob.includes(ql)) return false;
      }
      return true;
    });
  }, [comments, source, lang, q]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {showSourceFilter ? (
          <div className="flex items-center gap-1 rounded-md border border-admin-border bg-white p-1">
            {(["all", "inline", "beta", "pricing"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`rounded px-2 py-1 text-[12px] font-medium transition-colors ${
                  source === s
                    ? "bg-admin-surface-elevated text-admin-text-primary"
                    : "text-admin-text-secondary hover:text-admin-text-primary"
                }`}
              >
                {s === "all" ? "Todas origens" : SOURCE_LABEL[s]}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-1 rounded-md border border-admin-border bg-white p-1">
          {(["all", "pt", "en", "other"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded px-2 py-1 text-[12px] font-medium transition-colors ${
                lang === l
                  ? "bg-admin-surface-elevated text-admin-text-primary"
                  : "text-admin-text-secondary hover:text-admin-text-primary"
              }`}
            >
              {l === "all" ? "Todos idiomas" : LANG_LABEL[l]}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar texto ou email…"
          className="flex-1 min-w-[180px] rounded-md border border-admin-border bg-white px-3 py-1.5 text-[13px] text-admin-text-primary placeholder:text-admin-text-secondary focus:outline-none focus:ring-2 focus:ring-admin-text-primary/10"
        />
        <span className="text-[12px] text-admin-text-secondary tabular-nums">
          {filtered.length}/{comments.length}
        </span>
        <button
          type="button"
          onClick={() => downloadCsv(filtered)}
          disabled={filtered.length === 0}
          className="rounded-md border border-admin-border bg-white px-2.5 py-1.5 text-[12px] font-medium text-admin-text-primary transition-colors hover:bg-admin-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
          title="Exportar comentários filtrados para CSV"
        >
          Exportar CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-admin-border bg-white px-4 py-6 text-center text-[13px] text-admin-text-secondary">
          {emptyText}
        </div>
      ) : (
        <ul className="m-0 list-none p-0 space-y-2">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-admin-border bg-white px-3 py-2.5 text-[13px]"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                <span
                  className="inline-flex items-center rounded-full px-2 py-[1px] text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    background: `${SOURCE_COLOR[c.source]}15`,
                    color: SOURCE_COLOR[c.source],
                  }}
                >
                  {SOURCE_LABEL[c.source]}
                </span>
                {c.rating !== null ? (
                  <span className="text-[11px] font-semibold tabular-nums text-admin-text-primary">
                    {c.rating}/5
                  </span>
                ) : null}
                {c.block ? (
                  <span className="text-[11px] text-admin-text-secondary">
                    {BLOCK_LABEL[c.block] ?? c.block}
                  </span>
                ) : null}
                {c.intent ? (
                  <span className="text-[11px] text-admin-text-secondary">
                    intenção: {c.intent}
                  </span>
                ) : null}
                <span className="text-[11px] text-admin-text-secondary">·</span>
                <span className="text-[11px] text-admin-text-secondary">
                  {c.authorEmail ?? c.authorName ?? "anónimo"}
                </span>
                <span className="text-[11px] text-admin-text-secondary">·</span>
                <span className="text-[11px] text-admin-text-secondary tabular-nums">
                  {fmtDateTime(c.createdAt)}
                </span>
                <span
                  className="ml-auto rounded border border-admin-border px-1.5 text-[10px] font-semibold uppercase text-admin-text-secondary"
                  title="Idioma detectado"
                >
                  {LANG_LABEL[c.language]}
                </span>
              </div>
              <p className="m-0 leading-snug text-admin-text-primary">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}