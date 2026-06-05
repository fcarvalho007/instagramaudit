/**
 * GET /api/debug/lead-session-status
 *
 * Admin-gated diagnostic endpoint to investigate why `lead_session` is or
 * isn't honored across onboarding → checkout in production. Returns ONLY
 * safe shape/boolean info. Never returns the raw cookie, signature, full
 * lead id, PII, or secrets.
 *
 * Call from the same browser as the failing session, after logging into
 * `/admin` (so `X-Admin-Email` is available via the admin gate). Example
 * from DevTools:
 *
 *   await fetch('/api/debug/lead-session-status', {
 *     headers: { 'X-Admin-Email': localStorage.getItem('admin-email') }
 *   }).then(r => r.json())
 */

import { createFileRoute } from "@tanstack/react-router";
import { getRequestHost } from "@tanstack/react-start/server";

import { requireAdminSession } from "@/lib/admin/session";
import {
  LEAD_COOKIE_NAME,
  decodeLeadCookie,
} from "@/lib/leads/lead-cookie.server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COOKIE_ATTRS_EXPECTED =
  "Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=None; Partitioned";

type CookieShape = "missing" | "malformed" | "looks_valid_shape";

interface CookieParse {
  hasLeadSessionCookie: boolean;
  shape: CookieShape;
  segmentCount: number;
  rawValue: string | null;
  cookieNames: string[];
}

function parseCookieHeader(header: string | null): CookieParse {
  const out: CookieParse = {
    hasLeadSessionCookie: false,
    shape: "missing",
    segmentCount: 0,
    rawValue: null,
    cookieNames: [],
  };
  if (!header) return out;

  for (const segment of header.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    const name = eq === -1 ? trimmed : trimmed.slice(0, eq);
    if (name && !out.cookieNames.includes(name)) out.cookieNames.push(name);
    if (name === LEAD_COOKIE_NAME && eq !== -1) {
      const value = decodeURIComponent(trimmed.slice(eq + 1));
      out.hasLeadSessionCookie = true;
      out.rawValue = value;
      const parts = value.split(".");
      out.segmentCount = parts.length;
      out.shape =
        parts.length === 3 && UUID_RE.test(parts[0])
          ? "looks_valid_shape"
          : "malformed";
    }
  }
  return out;
}

export const Route = createFileRoute("/api/debug/lead-session-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Admin gate. Throws a Response (401/403) when unauthorized.
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          return new Response("Unauthorized", { status: 401 });
        }

        const cookieHeader = request.headers.get("cookie");
        const parsed = parseCookieHeader(cookieHeader);

        const decoded = parsed.hasLeadSessionCookie
          ? decodeLeadCookie(parsed.rawValue)
          : null;

        let leadExists = false;
        if (decoded?.leadId) {
          try {
            const { supabaseAdmin } = await import(
              "@/integrations/supabase/client.server"
            );
            const { data } = await supabaseAdmin
              .from("leads")
              .select("id")
              .eq("id", decoded.leadId)
              .maybeSingle();
            leadExists = Boolean(data);
          } catch {
            leadExists = false;
          }
        }

        const url = new URL(request.url);
        const secret = process.env.SESSION_SECRET;

        const body = {
          timestamp: new Date().toISOString(),
          request_host: getRequestHost() ?? url.host,
          request_protocol: url.protocol.replace(":", ""),
          has_cookie_header: Boolean(cookieHeader),
          cookie_names_present: parsed.cookieNames,
          has_lead_session_cookie: parsed.hasLeadSessionCookie,
          cookie_value_shape: parsed.shape,
          cookie_segment_count: parsed.segmentCount,
          decoded_cookie_valid: Boolean(decoded),
          lead_id_present: Boolean(decoded?.leadId),
          lead_id_prefix: decoded?.leadId ? decoded.leadId.slice(0, 8) : null,
          lead_exists: leadExists,
          issued_at_sec: decoded?.issuedAtSec ?? null,
          session_secret_configured: Boolean(secret && secret.length >= 32),
          cookie_attrs_expected: COOKIE_ATTRS_EXPECTED,
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});