/**
 * GET/POST /api/public/verify-email
 *
 * Confirma propriedade do email apresentando um token assinado (Camada B
 * do plano: usado quando `EMAIL_VERIFICATION_MODE=magic_link`). Idempotente:
 * cliques repetidos no link voltam a emitir o cookie e o grant inicial
 * (que já é idempotente via unique index em `credit_ledger`).
 *
 * Sem PII na resposta — só `lead_id` e `credits` ou um HTML neutro.
 */

import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getBalance, grantInitialCredits } from "@/lib/credits/credits.server";
import { encodeLeadCookie, LEAD_COOKIE_NAME } from "@/lib/leads/lead-cookie.server";
import { verifyVerificationToken } from "@/lib/email/verification-token.server";

function setCookieHeader(leadId: string): string {
  const value = encodeLeadCookie(leadId);
  const maxAge = 60 * 60 * 24 * 365;
  return [
    `${LEAD_COOKIE_NAME}=${value}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Partitioned",
  ].join("; ");
}

function resolveBaseUrl(): string {
  const base = (
    process.env.PUBLIC_APP_BASE_URL ??
    process.env.PDF_PUBLIC_BASE_URL ??
    "https://auditprofiles.com"
  ).trim();
  return base.replace(/\/+$/, "");
}

function neutralHtml(
  title: string,
  body: string,
  status: number,
): Response {
  const html = `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#FAFBFD;color:#03045E;margin:0;padding:48px 16px;display:flex;justify-content:center}main{max-width:480px;background:#fff;border:1px solid rgba(3,4,94,0.08);border-radius:14px;padding:32px}h1{font-family:Fraunces,Georgia,serif;font-size:24px;margin:0 0 12px}p{font-size:15px;line-height:1.55;color:#03045E;opacity:0.85;margin:0 0 12px}a{color:#0077B6;text-decoration:none;font-weight:600}</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

interface ClaimOutcome {
  ok: true;
  leadId: string;
  credits: number;
  redirectTo: string;
}

async function claimFromToken(
  token: string,
): Promise<ClaimOutcome | { ok: false; reason: "invalid" | "expired" }> {
  const verified = verifyVerificationToken(token);
  if (!verified) {
    // Distinguish expired vs structurally invalid for UX. `verifyVerificationToken`
    // returns null in both — re-check shape to differentiate when possible.
    const looksWellFormed =
      typeof token === "string" && token.split(".").length === 2;
    return { ok: false, reason: looksWellFormed ? "expired" : "invalid" };
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
    return { ok: false, reason: "invalid" };
  }

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
  const redirectTo = verified.handle
    ? `${base}/analyze/${encodeURIComponent(verified.handle.replace(/^@/, ""))}`
    : `${base}/`;

  return { ok: true, leadId: verified.leadId, credits, redirectTo };
}

async function handleGet(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const outcome = await claimFromToken(token);
  if (outcome.ok) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: outcome.redirectTo,
        "Set-Cookie": setCookieHeader(outcome.leadId),
        "Cache-Control": "no-store",
      },
    });
  }
  if (outcome.reason === "expired") {
    return neutralHtml(
      "Link expirado",
      `<p>Este link de confirmação já expirou. Volta a pedir o relatório no site para receberes um novo.</p><p><a href="${resolveBaseUrl()}/">Voltar ao AuditProfiles</a></p>`,
      410,
    );
  }
  return neutralHtml(
    "Link inválido",
    `<p>Não conseguimos validar este link. Pode ter sido copiado de forma incompleta — tenta abrir directamente no email original ou pede um novo.</p><p><a href="${resolveBaseUrl()}/">Voltar ao AuditProfiles</a></p>`,
    400,
  );
}

async function handlePost(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error_code: "INVALID_PAYLOAD" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  const token =
    raw && typeof raw === "object" && typeof (raw as { token?: unknown }).token === "string"
      ? ((raw as { token: string }).token)
      : "";
  const outcome = await claimFromToken(token);
  if (!outcome.ok) {
    return new Response(
      JSON.stringify({ ok: false, error_code: outcome.reason }),
      { status: outcome.reason === "expired" ? 410 : 400, headers: { "Content-Type": "application/json" } },
    );
  }
  return new Response(
    JSON.stringify({
      ok: true,
      lead_id: outcome.leadId,
      credits: outcome.credits,
      redirect_to: outcome.redirectTo,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setCookieHeader(outcome.leadId),
        "Cache-Control": "no-store",
      },
    },
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