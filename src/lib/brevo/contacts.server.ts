/**
 * Brevo contacts domain — upsert by email into the lead-magnet list.
 * Idempotent: `updateEnabled: true` makes the same call create or update.
 */

import { brevoFetch } from "./client.server";
import type {
  BrevoAttributes,
  UpsertBrevoContactInput,
  UpsertBrevoContactResult,
} from "./types";

function cleanAttributes(input: BrevoAttributes | undefined): BrevoAttributes {
  const out: BrevoAttributes = {};
  if (!input) return out;
  for (const [k, v] of Object.entries(input)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

function resolveListIds(override?: number[]): number[] | { error: string } {
  if (override && override.length > 0) return override;
  const raw = process.env.BREVO_LEAD_MAGNET_LIST_ID?.trim();
  if (!raw) return { error: "BREVO_LEAD_MAGNET_LIST_ID_MISSING" };
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { error: "BREVO_LEAD_MAGNET_LIST_ID_INVALID" };
  }
  return [parsed];
}

export async function upsertBrevoContact(
  input: UpsertBrevoContactInput,
): Promise<UpsertBrevoContactResult> {
  const email = input.email?.trim().toLowerCase();
  if (!email) return { ok: false, reason: "BREVO_EMAIL_MISSING" };

  const listsOrErr = resolveListIds(input.listIds);
  if ("error" in listsOrErr) return { ok: false, reason: listsOrErr.error };

  const result = await brevoFetch("/v3/contacts", {
    method: "POST",
    body: {
      email,
      updateEnabled: true,
      listIds: listsOrErr,
      attributes: cleanAttributes(input.attributes),
    },
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  // 201 Created → { id }. 204 No Content (existing contact) → no body.
  let brevoId: number | null = null;
  if (result.status !== 204 && result.bodyText) {
    try {
      const json = JSON.parse(result.bodyText) as { id?: number };
      brevoId = typeof json?.id === "number" ? json.id : null;
    } catch {
      // ignore parse error — upsert already succeeded
    }
  }
  return { ok: true, brevoId, status: result.status };
}