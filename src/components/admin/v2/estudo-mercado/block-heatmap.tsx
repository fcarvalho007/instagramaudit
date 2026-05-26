/**
 * Heatmap bloco × emoji (1..5). Intensidade da célula proporcional ao
 * número de respostas. Mostra média por linha à direita.
 */

import { chartPalette } from "./chart-palette";

const BLOCK_LABEL: Record<string, string> = {
  overview: "Visão geral",
  diagnostic: "Diagnóstico",
  performance: "Performance",
  content: "Conteúdo",
};
const EMOJI: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "😡", 2: "😕", 3: "😐", 4: "🙂", 5: "🤩",
};

export interface HeatmapBlock {
  block: string;
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function BlockHeatmap({ rows }: { rows: HeatmapBlock[] }) {
  const max = Math.max(
    1,
    ...rows.flatMap((r) => Object.values(r.counts) as number[]),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-separate border-spacing-y-1">
        <thead>
          <tr className="text-left text-admin-text-secondary">
            <th className="font-medium pb-1 pr-3">Bloco</th>
            {([1, 2, 3, 4, 5] as const).map((k) => (
              <th key={k} className="font-medium pb-1 px-2 text-center">
                <span className="block text-[14px]">{EMOJI[k]}</span>
                <span className="block text-[10px] uppercase tracking-wide">{k}/5</span>
              </th>
            ))}
            <th className="font-medium pb-1 pl-3 text-right tabular-nums">N</th>
            <th className="font-medium pb-1 pl-3 text-right tabular-nums">Média</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const total = (Object.values(r.counts) as number[]).reduce(
              (a, b) => a + b, 0,
            );
            const sum = ([1, 2, 3, 4, 5] as const).reduce(
              (acc, k) => acc + r.counts[k] * k, 0,
            );
            const mean = total > 0 ? sum / total : null;
            return (
              <tr key={r.block}>
                <td className="py-1.5 pr-3 font-medium text-admin-text-primary">
                  {BLOCK_LABEL[r.block] ?? r.block}
                </td>
                {([1, 2, 3, 4, 5] as const).map((k) => {
                  const v = r.counts[k];
                  const intensity = v === 0 ? 0 : 0.12 + (v / max) * 0.78;
                  const blockLabel = BLOCK_LABEL[r.block] ?? r.block;
                  return (
                    <td key={k} className="px-1">
                      <div
                        className="flex h-9 items-center justify-center rounded-md text-[13px] font-semibold tabular-nums"
                        title={`${blockLabel} · ${EMOJI[k]} ${k}/5 · ${v} ${v === 1 ? "resposta" : "respostas"}`}
                        style={{
                          background:
                            v === 0
                              ? "rgb(var(--admin-border) / 0.25)"
                              : hexWithAlpha(chartPalette.accentPrimary, intensity),
                          color: intensity > 0.55 ? "#fff" : "rgb(var(--admin-text-primary))",
                        }}
                      >
                        {v}
                      </div>
                    </td>
                  );
                })}
                <td className="py-1.5 pl-3 text-right tabular-nums text-admin-text-primary">
                  {total}
                </td>
                <td className="py-1.5 pl-3 text-right tabular-nums text-admin-text-primary">
                  {mean !== null ? mean.toFixed(2) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}