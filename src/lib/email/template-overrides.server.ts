/**
 * Camada de overrides para os templates de email beta.
 *
 * `renderWithOverride(key, vars, fallbackRender)` devolve o `RenderedEmail`
 * final a enviar:
 *  - se existir um override em DB com `body_html` definido, constrói o
 *    email inteiramente a partir do override (subject, headline, preheader,
 *    body) e aplica o `wrapHtml` partilhado;
 *  - se existir um override apenas com `subject`, usa o `subject` do
 *    override e mantém o HTML/texto do fallback;
 *  - se não existir override, devolve `fallbackRender()` inalterado.
 *
 * Os placeholders `{{var}}` são substituídos no momento da renderização
 * com base no objeto `vars` recebido.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { EmailTemplateKey } from "@/lib/admin/email-template-registry";
import { type RenderedEmail, wrapHtml } from "./shared";

export interface EmailTemplateOverride {
  subject: string | null;
  preheader: string | null;
  headline: string | null;
  body_html: string | null;
  body_text: string | null;
  updated_at: string | null;
  updated_by_email: string | null;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<
  EmailTemplateKey,
  { at: number; value: EmailTemplateOverride | null }
>();

export function invalidateOverrideCache(key?: EmailTemplateKey): void {
  if (key) cache.delete(key);
  else cache.clear();
}

export async function loadOverride(
  key: EmailTemplateKey,
): Promise<EmailTemplateOverride | null> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  const { data, error } = await supabaseAdmin
    .from("email_template_overrides")
    .select(
      "subject, preheader, headline, body_html, body_text, updated_at, updated_by_email",
    )
    .eq("template_key", key)
    .maybeSingle();

  if (error) {
    console.error("[template-overrides] loadOverride failed", { key, error });
    cache.set(key, { at: Date.now(), value: null });
    return null;
  }

  const value = (data as EmailTemplateOverride | null) ?? null;
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Substitui `{{var}}` (com whitespace opcional) por `vars[var]`. */
export function applyVariables(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name) => {
    const v = vars[name];
    return v === undefined || v === null ? "" : String(v);
  });
}

function hasBodyOverride(o: EmailTemplateOverride | null): boolean {
  return !!o && typeof o.body_html === "string" && o.body_html.trim().length > 0;
}

/**
 * Renderiza um email aplicando o override em DB, se existir. Caso contrário
 * devolve o fallback inalterado.
 */
export async function renderWithOverride(
  key: EmailTemplateKey,
  vars: Record<string, string | number | null | undefined>,
  fallbackRender: () => RenderedEmail,
): Promise<RenderedEmail> {
  const override = await loadOverride(key);
  return renderWithOverrideSync(vars, fallbackRender, override);
}

/**
 * Versão síncrona — usada também pelo endpoint de preview, que recebe
 * o override diretamente do form (sem ir a DB).
 */
export function renderWithOverrideSync(
  vars: Record<string, string | number | null | undefined>,
  fallbackRender: () => RenderedEmail,
  override: EmailTemplateOverride | null,
): RenderedEmail {
  if (!override) return fallbackRender();

  const fallback = fallbackRender();

  // Override parcial (só subject): mantém HTML/texto do fallback.
  if (!hasBodyOverride(override)) {
    const subject = override.subject?.trim()
      ? applyVariables(override.subject, vars)
      : fallback.subject;
    return { ...fallback, subject };
  }

  const subject = override.subject?.trim()
    ? applyVariables(override.subject, vars)
    : fallback.subject;
  const headline = override.headline?.trim()
    ? applyVariables(override.headline, vars)
    : fallback.subject;
  const preheader = override.preheader?.trim()
    ? applyVariables(override.preheader, vars)
    : undefined;
  const bodyHtml = applyVariables(override.body_html ?? "", vars);
  const bodyText = override.body_text?.trim()
    ? applyVariables(override.body_text, vars)
    : fallback.text;

  return {
    subject,
    text: bodyText,
    html: wrapHtml({ title: subject, headline, bodyHtml, preheader }),
  };
}