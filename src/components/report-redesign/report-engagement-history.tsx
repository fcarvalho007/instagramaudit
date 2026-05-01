import { useEffect, useState } from "react";

import {
  getProfileEngagementHistory,
  type ProfileEngagementHistoryItem,
} from "@/lib/server/profile-history.functions";

interface Props {
  /** Handle do perfil analisado (sem @). */
  handle: string;
  /** Valor actual (já visível no gauge). Usado para contexto e fallback. */
  current: number;
}

const PT_MONTHS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")} ${PT_MONTHS[d.getMonth()]}`;
}

/**
 * Mini-histórico das últimas 4 análises (ou menos) para a secção "Posicionamento
 * face ao benchmark". Renderiza barras horizontais finas estilo Iconosquare,
 * uma por análise, ordenadas da mais antiga (topo) para a mais recente (base).
 *
 * Estados:
 *  - loading      → skeleton discreto
 *  - <2 análises  → linha tipográfica explicativa
 *  - ok           → 4 barras + valores + datas
 */
export function ReportEngagementHistory({ handle, current }: Props) {
  const [items, setItems] = useState<ProfileEngagementHistoryItem[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await getProfileEngagementHistory({
          data: { handle, limit: 4 },
        });
        if (cancelled) return;
        setItems(result);
      } catch {
        if (!cancelled) setErrored(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (errored) return null;

  if (items === null) {
    return (
      <div className="mt-7 pt-6 border-t border-border-subtle/60">
        <p className="text-eyebrow-sm text-content-tertiary mb-3">
          Histórico de análises
        </p>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-full rounded-full bg-surface-muted/70 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length < 2) {
    return (
      <div className="mt-7 pt-6 border-t border-border-subtle/60">
        <p className="text-eyebrow-sm text-content-tertiary mb-2">
          Histórico de análises
        </p>
        <p className="text-sm text-content-tertiary leading-relaxed">
          O histórico aparecerá após próximas análises deste perfil.
        </p>
      </div>
    );
  }

  // Mais antigo → mais recente (topo → base) é a ordem de leitura natural.
  const ordered = [...items].reverse();
  const max = Math.max(current, ...ordered.map((i) => i.engagementPct)) * 1.15;

  return (
    <div className="mt-7 pt-6 border-t border-border-subtle/60">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-eyebrow-sm text-content-tertiary">
          Histórico das últimas {ordered.length} análises
        </p>
        <p className="text-eyebrow-sm text-content-tertiary/80">
          envolvimento médio
        </p>
      </div>
      <ul className="space-y-2.5">
        {ordered.map((item, idx) => {
          const pct = (item.engagementPct / max) * 100;
          const isLatest = idx === ordered.length - 1;
          return (
            <li key={`${item.analyzedAt}-${idx}`} className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-content-tertiary w-14 shrink-0 tabular-nums">
                {formatShort(item.analyzedAt)}
              </span>
              <div className="relative flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className={
                    isLatest
                      ? "absolute inset-y-0 left-0 rounded-full bg-accent-primary"
                      : "absolute inset-y-0 left-0 rounded-full bg-accent-primary/45"
                  }
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
              </div>
              <span
                className={
                  isLatest
                    ? "font-mono text-[11px] font-semibold text-content-primary w-14 text-right tabular-nums"
                    : "font-mono text-[11px] text-content-secondary w-14 text-right tabular-nums"
                }
              >
                {item.engagementPct.toString().replace(".", ",")}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}