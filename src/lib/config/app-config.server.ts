/**
 * Server-only helpers to read `public.app_config` rows.
 *
 * Use this from server functions and server routes when the caller already
 * runs on the worker. For client components, prefer the `getPublicAppConfig`
 * server function in `app-config.functions.ts`.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AppConfigMap = Record<string, string>;

/**
 * Reads a subset of `app_config` keys in a single round-trip.
 * Missing rows are simply omitted from the returned map — callers are
 * expected to apply their own defaults.
 */
export async function readAppConfig(keys: string[]): Promise<AppConfigMap> {
  if (keys.length === 0) return {};
  const { data, error } = await supabaseAdmin
    .from("app_config")
    .select("key,value")
    .in("key", keys);

  if (error) {
    console.error("[app-config] read failed", { keys, error });
    return {};
  }

  const map: AppConfigMap = {};
  for (const row of data ?? []) {
    if (row?.key && typeof row.value === "string") {
      map[row.key] = row.value;
    }
  }
  return map;
}

/**
 * Reads a single `app_config` value, falling back to `fallback` when the row
 * is missing or the read fails.
 */
export async function readAppConfigValue(
  key: string,
  fallback: string,
): Promise<string> {
  const map = await readAppConfig([key]);
  return map[key] ?? fallback;
}

/** Parse an integer config value with a safe fallback. */
export function parseConfigInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Parse a boolean config value (literal "true" / "false"). */
export function parseConfigBool(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}