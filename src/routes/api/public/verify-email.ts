/**
 * GET/POST /api/public/verify-email
 *
 * Confirma propriedade do email apresentando um token assinado e promove
 * o visitante a sessão completa (`lead_session`).
 *
 * Ronda 5B:
 *   - consumo one-time via `jti` (`email_access_tokens`), fail-closed;
 *   - rate limiting por IP antes de qualquer trabalho;
 *   - `Cache-Control: no-store` também nas respostas de erro;
 *   - destino canónico resolvido a partir da `cache_key` do token;
 *   - o cookie scoped `report_capture_session` é limpo depois da promoção.
 *
 * Sem PII na resposta — só `lead_id` e `credits` ou um HTML neutro.
 */

import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getBalance, grantInitialCredits } from "@/lib/credits/credits.server";
import { encodeLeadCookie, LEAD_COOKIE_NAME } from "@/lib/leads/lead-cookie.server";
import { CAPTURE_COOKIE_NAME } from "@/lib/leads/report-capture-session.server";
import {
  consumeAccessToken,
  resolveReportPath,
} from "@/lib/email/access-token-consumption.server";
import { recordAccessEvent } from "@/lib/leads/access-events.server";
import { verifyVerificationToken } from "@/lib/email/verification-token.server";

function setCookieHeaders(leadId: string): string[] {
  const value = encodeLeadCookie(leadId);
  const maxAge = 60 * 60 * 24 * 365;
  return [
    [
      `${LEAD_COOKIE_NAME}=${value}`,
      `Max-Age=${maxAge}`,
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=None",
      "Partitioned",
    ].join("; "),
    // O acesso scoped deixa de fazer sentido depois da verificação.
    [
      `${CAPTURE_COOKIE_NAME}=`,
      "Max-Age=0",
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=None",
      "Partitioned",
    ].join("; "),
  ];
}

function resolveBaseUrl(): string {
  const base = (
    process.env.PUBLIC_APP_BASE_URL ??
    process.env.PDF_PUBLIC_BASE_URL ??
    "https://auditprofiles.com"
  ).trim();
  return base.replace(/\/+$/, "");
}

// Rate limit best-effort por isolate: 20 tentativas por IP/hora.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 20;
const attempts = new Map<string, number[]>();

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    attempts.set(ip, list);
    return true;
  }
  list.push(now);
  attempts.set(ip, list);
  if (attempts.size > 5000) attempts.clear();
  return false;
}

function neutralHtml(title: string, body: string, status: number): Response {
  const html = `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex"/><meta name="referrer" content="no-referrer"/><title>${title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#FAFBFD;color:#03045E;margin:0;padding:48px 16px;display:flex;justify-content:center}main{max-width:480px;background:#fff;border:1px solid rgba(3,4,94,0.08);border-radius:14px;padding:32px}h1{font-family:Fraunces,Georgia,serif;font-size:24px;margin:0 0 12px}p{font-size:15px;line-height:1.55;color:#03045E;opacity:0.85;margin:0 0 12px}a{color:#0077B6;text-decoration:none;font-weight:600}</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

type ClaimFailure = "invalid" | "expired" | "already_used" | "rate_limited";

interface ClaimOutcome {
  ok: true;
  leadId: string;
  credits: number;
  redirectTo: string;
}

async function claimFromToken(
  token: string,
): Promise<ClaimOutcome | { ok: false; reason: ClaimFailure }> {
  const verified = verifyVerificationToken(token);
  if (!verified) {
    // Distinguish expired vs structurally invalid for UX. `verifyVerificationToken`
    // returns null in both — re-check shape to differentiate when possible.
    const looksWellFormed =
      typeof token === "string" && token.split(".").length === 2;
    const reason = looksWellFormed ? "expired" : "invalid";
    await recordAccessEvent({
      eventType: reason === "expired" ? "magic_link_expired" : "magic_link_invalid",
    });
    return { ok: false, reason };
  }

  // Defense-in-depth: confirmar que o lead ainda existe e que o email do
  // token bate com o `email_normalized` actual (caso o lead tenha sido
  // editado entretanto, o token velho não deve poder reclamar a nova conta).
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, email_normalized")
    .eq("id", verified.leadId)
    .maybeSingle();
  if (!lead || lead.email_normalized !== verified.email.toLowerCase()) {
    await recordAccessEvent({ eventType: "magic_link_invalid" });
    return { ok: false, reason: "invalid" };
  }

  // Consumo one-time. Tokens antigos (sem `jti`) mantêm o comportamento
  // reutilizável para não invalidar emails já enviados.
  if (verified.jti) {
    const consumed = await consumeAccessToken({
      jti: verified.jti,
      leadId: verified.leadId,
      expiresAtSec: verified.exp,
    });
    if (consumed !== "consumed") {
      await recordAccessEvent({
        eventType: "magic_link_invalid",
        leadId: verified.leadId,
        metadata: { outcome: consumed },
      });
      // Fail-closed: erro de BD não emite sessão.
      return { ok: false, reason: consumed === "already_used" ? "already_used" : "invalid" };
    }
  }

  await recordAccessEvent({
    eventType: "email_verified",
    leadId: verified.leadId,
    handle: verified.handle,
  });

  try {
    await grantInitialCredits(verified.leadId);
  } catch (err) {
    console.warn("[verify-email] grantInitialCredits warn:", err);
  }

  let credits = 0;
  try {
    credits = await getBalance(verified.leadId);
  } catch (err) {
    console.warn("[verify-email] getBalance warn:", err);
  }

  const base = resolveBaseUrl();
  // Destino canónico: `cache_key` → relatório exacto. Sem referência
  // utilizável, cai no handle do token e, por fim, na área privada.
  let path = await resolveReportPath({
    leadId: verified.leadId,
    reportRef: verified.reportRef,
  });
  if (!path && verified.handle) {
    path = `/analyze/${encodeURIComponent(verified.handle.replace(/^@/, ""))}`;
  }
  if (!path) path = "/app/reports";

  await recordAccessEvent({
    eventType: "full_session_created",
    leadId: verified.leadId,
    handle: verified.handle,
  });

  return {
    ok: true,
    leadId: verified.leadId,
    credits,
    redirectTo: `${base}${path}`,
  };
}

function failureHtml(reason: ClaimFailure): Response {
  const home = resolveBaseUrl();
  if (reason === "rate_limited") {
    return neutralHtml(
      "Demasiadas tentativas",
      `<p>Foram feitas demasiadas tentativas a partir desta ligação. Tenta novamente dentro de alguns minutos.</p><p><a href="${home}/">Voltar ao AuditProfiles</a></p>`,
      429,
    );
  }
  if (reason === "already_used") {
    return neutralHtml(
      "Link já utilizado",
      `<p>Este link de acesso só pode ser aberto uma vez, por segurança. Pede um novo link no site para voltares à tua auditoria.</p><p><a href="${home}/">Pedir novo link</a></p>`,
      410,
    );
  }
  if (reason === "expired") {
    return neutralHtml(
      "Link expirado",
      `<p>Este link de confirmação já expirou. Volta a pedir o relatório no site para receberes um novo.</p><p><a href="${home}/">Voltar ao AuditProfiles</a></p>`,
      410,
    );
  }
  return neutralHtml(
    "Link inválido",
    `<p>Não conseguimos validar este link. Pode ter sido copiado de forma incompleta — tenta abrir directamente no email original ou pede um novo.</p><p><a href="${home}/">Voltar ao AuditProfiles</a></p>`,
    400,
  );
}

/**
 * Página de confirmação humana.
 *
 * O GET nunca consome o token: scanners de email e prefetch de clientes
 * fazem GET automático e queimariam o link one-time. O consumo acontece
 * apenas no POST despoletado por esta página.
 */
function confirmHtml(token: string): Response {
  const safeToken = JSON.stringify(token);
  const home = resolveBaseUrl();
  const html = `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex"/><meta name="referrer" content="no-referrer"/><title>Confirmar acesso</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#FAFBFD;color:#03045E;margin:0;padding:48px 16px;display:flex;justify-content:center}main{max-width:480px;width:100%;background:#fff;border:1px solid rgba(3,4,94,0.08);border-radius:14px;padding:32px}h1{font-family:Fraunces,Georgia,serif;font-size:24px;margin:0 0 12px}p{font-size:15px;line-height:1.55;opacity:0.85;margin:0 0 20px}button{width:100%;background:#0077B6;color:#fff;border:0;border-radius:10px;padding:14px 18px;font-size:15px;font-weight:600;cursor:pointer}button[disabled]{opacity:0.6;cursor:progress}a{color:#0077B6;text-decoration:none;font-weight:600}#err{color:#9B2C2C;font-size:14px;margin-top:14px}</style></head><body><main><h1>Confirmar acesso</h1><p>Carrega no botão para confirmares o teu endereço de email e abrires a tua auditoria.</p><button id="go" type="button">Confirmar e abrir auditoria</button><p id="err" hidden></p><p style="margin-top:20px"><a href="${home}/">Voltar ao AuditProfiles</a></p></main><script>
（function(){var b=document.getElementById('go');var e=document.getElementById('err');b.addEventListener('click',function(){b.disabled=true;b.textContent='A confirmar…';fetch(window.location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({token:${safeToken}})}).then(function(r){return r.json().then(function(j){return {s:r.status,j:j}})}).then(function(o){if(o.j&&o.j.ok&&o.j.redirect_to){window.location.replace(o.j.redirect_to);return}b.disabled=false;b.textContent='Confirmar e abrir auditoria';e.hidden=false;e.textContent=o.j&&o.j.error_code==='expired'?'Este link expirou. Pede um novo acesso.':(o.j&&o.j.error_code==='already_used'?'Este link já foi utilizado. Pede um novo acesso.':'Não foi possível validar este link. Pede um novo acesso.')}).catch(function(){b.disabled=false;b.textContent='Confirmar e abrir auditoria';e.hidden=false;e.textContent='Não foi possível validar este link. Tenta novamente.'})})})();
</script></main></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function handleGet(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (rateLimited(clientIp(request))) {
    await recordAccessEvent({ eventType: "magic_link_invalid" });
    return failureHtml("rate_limited");
  }
  if (!token) return failureHtml("invalid");
  await recordAccessEvent({ eventType: "magic_link_clicked" });
  // Verificação apenas de assinatura/validade: sem consumo, sem sessão,
  // sem créditos. Um scanner que faça GET não inutiliza o link.
  const verified = verifyVerificationToken(token);
  if (!verified) {
    const looksWellFormed = token.split(".").length === 2;
    return failureHtml(looksWellFormed ? "expired" : "invalid");
  }
  return confirmHtml(token);
}

function statusForFailure(reason: ClaimFailure): number {
  if (reason === "rate_limited") return 429;
  if (reason === "expired" || reason === "already_used") return 410;
  return 400;
}

async function handlePost(request: Request): Promise<Response> {
  if (rateLimited(clientIp(request))) {
    return new Response(
      JSON.stringify({ ok: false, error_code: "rate_limited" }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    );
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error_code: "INVALID_PAYLOAD" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    );
  }
  const token =
    raw && typeof raw === "object" && typeof (raw as { token?: unknown }).token === "string"
      ? (raw as { token: string }).token
      : "";
  const outcome = await claimFromToken(token);
  if (!outcome.ok) {
    return new Response(
      JSON.stringify({ ok: false, error_code: outcome.reason }),
      {
        status: statusForFailure(outcome.reason),
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    );
  }
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  for (const cookie of setCookieHeaders(outcome.leadId)) {
    headers.append("Set-Cookie", cookie);
  }
  return new Response(
    JSON.stringify({
      ok: true,
      lead_id: outcome.leadId,
      credits: outcome.credits,
      redirect_to: outcome.redirectTo,
    }),
    { status: 200, headers },
  );
}

export const Route = createFileRoute("/api/public/verify-email")({
  server: {
    handlers: {
      GET: async ({ request }) => handleGet(request),
      POST: async ({ request }) => handlePost(request),
    },
  },
});
