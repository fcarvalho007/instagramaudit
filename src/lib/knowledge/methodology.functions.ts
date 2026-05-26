/**
 * Server function que entrega as fontes editoriais a mostrar no rodapé
 * do relatório (`ReportMethodology` → "Fontes de referência").
 *
 * Lê de `knowledge_sources` (editável em `/admin/conhecimento`). Filtra
 * fontes sem URL (não-citáveis no relatório público). Devolve um shape
 * estável e seguro — sem `id`, sem `created_by_email`.
 */

import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface ReportMethodologySource {
  name: string;
  url: string;
  publishedYear: number | null;
  /** Ex.: "Mai 2026". Derivado de `published_at`. */
  lastUpdatedLabel: string | null;
  /** ≤140 chars, vem de `notes` truncado. `null` se vazio. */
  shortDescription: string | null;
  /** `study | api | internal | dataset | ...` — para futura distinção visual. */
  type: string | null;
}

const PT_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

function formatPtLabel(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return `${PT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function truncate(input: string | null, max: number): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export const getReportMethodologySources = createServerFn({
  method: "GET",
}).handler(async (): Promise<{ sources: ReportMethodologySource[] }> => {
  try {
    const { data, error } = await supabaseAdmin
      .from("knowledge_sources")
      .select("name, url, published_at, notes, type")
      .not("url", "is", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(8);

    if (error) {
      console.error(
        "[methodology] failed to load knowledge_sources",
        error.message,
      );
      return { sources: [] };
    }

    const sources: ReportMethodologySource[] = (data ?? [])
      .filter(
        (row): row is { name: string; url: string; published_at: string | null; notes: string | null; type: string | null } =>
          typeof row.name === "string" &&
          row.name.length > 0 &&
          typeof row.url === "string" &&
          row.url.length > 0,
      )
      .map((row) => ({
        name: row.name,
        url: row.url,
        publishedYear: row.published_at
          ? new Date(row.published_at).getUTCFullYear()
          : null,
        lastUpdatedLabel: formatPtLabel(row.published_at),
        shortDescription: truncate(row.notes, 140),
        type: row.type ?? null,
      }));

    return { sources };
  } catch (err) {
    console.error("[methodology] threw while loading sources", err);
    return { sources: [] };
  }
});
