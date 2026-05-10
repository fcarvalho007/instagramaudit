/**
 * Server-only sender for the "personal area saved" transactional email.
 *
 * Fired once per first-time unlock of a (lead, snapshot) pair. Never throws —
 * any failure (missing API key, timeout, Resend 4xx/5xx, network error) is
 * returned as `{ ok: false, reason }` so the caller can record an event
 * without blocking the unlock response.
 */

import { renderPersonalAreaSaved } from "./templates/personal-area-saved";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_SENDER_FROM = "InstaBench <onboarding@resend.dev>";
const TIMEOUT_MS = 8_000;
const DEFAULT_BASE_URL = "https://instagramaudit.lovable.app";

export interface SendPersonalAreaSavedArgs {
  toEmail: string;
  firstName: string | null;
  instagramHandle: string | null;
}

export type SendPersonalAreaSavedResult =
  | { ok: true; messageId: string | null }
  | { ok: false; reason: string };

function resolveAppUrl(): string {
  const base = (
    process.env.PUBLIC_APP_BASE_URL ??
    process.env.PDF_PUBLIC_BASE_URL ??
    DEFAULT_BASE_URL
  ).trim();
  const cleaned = base.replace(/\/+$/, "");
  return `${cleaned}/app/reports`;
}

function resolveSender(): string {
  return (process.env.RESEND_FROM ?? DEFAULT_SENDER_FROM).trim();
}

export async function sendPersonalAreaSavedEmail(
  args: SendPersonalAreaSavedArgs,
): Promise<SendPersonalAreaSavedResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "RESEND_API_KEY_MISSING" };
  }

  let rendered;
  try {
    rendered = renderPersonalAreaSaved({
      firstName: args.firstName,
      instagramHandle: args.instagramHandle,
      appUrl: resolveAppUrl(),
    });
  } catch (err) {
    return {
      ok: false,
      reason: `RENDER_FAILED:${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: resolveSender(),
        to: [args.toEmail],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let errBody = "";
      try {
        errBody = (await res.text()).slice(0, 200);
      } catch {
        // ignore
      }
      return { ok: false, reason: `RESEND_${res.status}:${errBody}` };
    }

    let messageId: string | null = null;
    try {
      const json = (await res.json()) as { id?: string };
      messageId = json?.id ?? null;
    } catch {
      // ignore parse error — send already succeeded
    }
    return { ok: true, messageId };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: "RESEND_TIMEOUT" };
    }
    return {
      ok: false,
      reason: `RESEND_NETWORK:${err instanceof Error ? err.message : "unknown"}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}