/**
 * Server-only Brevo helper.
 *
 * Calls go through the Lovable connector gateway — never directly to
 * api.brevo.com. The gateway handles auth header rewrites and OAuth/API
 * key rotation transparently.
 *
 * `upsertBrevoContact` is best-effort: it never throws and always returns
 * a typed result so the caller can record an outcome event without
 * blocking the user-facing flow.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";
const TIMEOUT_MS = 8_000;

export type BrevoAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface UpsertBrevoContactInput {
  email: string;
  attributes?: BrevoAttributes;
  /** Optional override; defaults to [BREVO_LEAD_MAGNET_LIST_ID]. */
  listIds?: number[];
}

export type UpsertBrevoContactResult =
  | { ok: true; brevoId: number | null; status: number }
  | { ok: false; reason: string };

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

/**
 * Idempotent upsert by email. Uses Brevo's `updateEnabled: true` so the
 * same call creates or updates the contact and (re)adds it to the list.
 */
export async function upsertBrevoContact(
  input: UpsertBrevoContactInput,
): Promise<UpsertBrevoContactResult> {
  const lovableKey = process.env.LOVABLE_API_KEY?.trim();
  if (!lovableKey) return { ok: false, reason: "LOVABLE_API_KEY_MISSING" };

  const brevoKey = process.env.BREVO_API_KEY?.trim();
  if (!brevoKey) return { ok: false, reason: "BREVO_API_KEY_MISSING" };

  const email = input.email?.trim().toLowerCase();
  if (!email) return { ok: false, reason: "BREVO_EMAIL_MISSING" };

  const listsOrErr = resolveListIds(input.listIds);
  if ("error" in listsOrErr) return { ok: false, reason: listsOrErr.error };

  const body = {
    email,
    updateEnabled: true,
    listIds: listsOrErr,
    attributes: cleanAttributes(input.attributes),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${GATEWAY_URL}/v3/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": brevoKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      let excerpt = "";
      try {
        excerpt = (await res.text()).slice(0, 200);
      } catch {
        // ignore
      }
      return { ok: false, reason: `BREVO_${res.status}:${excerpt}` };
    }

    // 201 Created returns { id }. 204 No Content (existing contact updated)
    // returns no body. Both are success.
    let brevoId: number | null = null;
    if (res.status !== 204) {
      try {
        const json = (await res.json()) as { id?: number };
        brevoId = typeof json?.id === "number" ? json.id : null;
      } catch {
        // ignore parse error — upsert already succeeded
      }
    }
    return { ok: true, brevoId, status: res.status };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: "BREVO_TIMEOUT" };
    }
    return {
      ok: false,
      reason: `BREVO_NETWORK:${err instanceof Error ? err.message : "unknown"}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}