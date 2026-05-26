/**
 * Editor de templates de email (`/admin/automacoes/templates/$key`).
 *
 * Permite editar subject, preheader, headline, HTML e texto. O preview
 * à direita é renderizado via `/api/admin/email-templates/$key/preview`
 * com debounce. Gravar persiste em `email_template_overrides` (history
 * automática). "Repor predefinido" elimina o override (também regista
 * em history). O layout exterior (cartão + footer) é sempre aplicado
 * pelo `wrapHtml` partilhado — o admin edita apenas o conteúdo interior.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { adminFetch } from "@/lib/admin/fetch";
import { AdminCard } from "../admin-card";

interface TemplateParts {
  subject: string;
  preheader: string;
  headline: string;
  body_html: string;
  body_text: string;
}

interface TemplateResponse {
  key: string;
  title: string;
  category: string;
  wired: boolean;
  wiredAt: string | null;
  wiredNote: string | null;
  variables: string[];
  defaults: TemplateParts;
  override: (TemplateParts & {
    updated_at: string | null;
    updated_by_email: string | null;
  }) | null;
}

function partsFromResponse(d: TemplateResponse): TemplateParts {
  const o = d.override;
  return {
    subject: o?.subject ?? d.defaults.subject,
    preheader: o?.preheader ?? d.defaults.preheader,
    headline: o?.headline ?? d.defaults.headline,
    body_html: o?.body_html ?? d.defaults.body_html,
    body_text: o?.body_text ?? d.defaults.body_text,
  };
}

export function TemplateEditor({ templateKey }: { templateKey: string }) {
  const navigate = useNavigate();
  const [data, setData] = useState<TemplateResponse | null>(null);
  const [parts, setParts] = useState<TemplateParts | null>(null);
  const [initial, setInitial] = useState<TemplateParts | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [previewing, setPreviewing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const dirty = useMemo(() => {
    if (!parts || !initial) return false;
    return (Object.keys(parts) as (keyof TemplateParts)[]).some(
      (k) => parts[k] !== initial[k],
    );
  }, [parts, initial]);

  // Load template
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    adminFetch(`/api/admin/email-templates/${templateKey}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as TemplateResponse;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        const p = partsFromResponse(d);
        setParts(p);
        setInitial(p);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Erro a carregar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [templateKey]);

  // Debounced preview
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!parts) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      setPreviewing(true);
      adminFetch(`/api/admin/email-templates/${templateKey}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parts),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return (await res.json()) as { subject: string; html: string };
        })
        .then((r) => {
          setPreviewHtml(r.html);
          setPreviewSubject(r.subject);
        })
        .catch(() => { /* keep previous preview */ })
        .finally(() => setPreviewing(false));
    }, 400);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [parts, templateKey]);

  async function handleSave() {
    if (!parts) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/email-templates/${templateKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parts),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setInitial(parts);
      toast.success("Template guardado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!data) return;
    if (!confirm("Repor o template para os valores predefinidos? O override atual será removido (fica registado no histórico).")) return;
    setResetting(true);
    try {
      const res = await adminFetch(`/api/admin/email-templates/${templateKey}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const defaults = data.defaults;
      setParts(defaults);
      setInitial(defaults);
      setData({ ...data, override: null });
      toast.success("Template reposto para o predefinido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao repor");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-[13px] text-admin-text-secondary">A carregar…</div>
    );
  }

  if (loadError || !data || !parts) {
    return (
      <div className="p-6">
        <AdminCard>
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[13px] text-admin-text-primary">
              Não foi possível carregar o template.
            </p>
            {loadError && (
              <p className="m-0 font-mono text-[11px] text-admin-text-tertiary">
                {loadError}
              </p>
            )}
            <button
              type="button"
              onClick={() => navigate({ to: "/admin/automacoes" })}
              className="self-start rounded-md border px-3 py-1.5 text-[12px] font-medium text-admin-text-primary hover:bg-admin-surface-elevated"
              style={{ borderColor: "rgb(var(--admin-border-default))" }}
            >
              ← Voltar
            </button>
          </div>
        </AdminCard>
      </div>
    );
  }

  const hasOverride = !!data.override;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          to="/admin/automacoes"
          className="text-eyebrow-sm text-admin-text-tertiary hover:text-admin-text-primary"
        >
          ← Voltar a Automações
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-[20px] font-semibold text-admin-text-primary">
              {data.title}
            </h1>
            <p className="m-0 font-mono text-[11px] text-admin-text-tertiary">
              {data.key} · {data.category}
              {hasOverride && data.override?.updated_at ? (
                <> · editado por {data.override.updated_by_email ?? "admin"} em {new Date(data.override.updated_at).toLocaleString("pt-PT")}</>
              ) : (
                <> · sem override (a usar predefinido)</>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting || !hasOverride}
              className="rounded-md border px-3 py-1.5 text-[12px] font-medium text-admin-text-primary hover:bg-admin-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: "rgb(var(--admin-border-default))" }}
            >
              {resetting ? "A repor…" : "Repor predefinido"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="rounded-md border px-3 py-1.5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "rgb(var(--admin-accent-500))",
                borderColor: "rgb(var(--admin-accent-500))",
              }}
            >
              {saving ? "A guardar…" : dirty ? "Guardar alterações" : "Guardado"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Editor */}
        <AdminCard>
          <div className="flex flex-col gap-4">
            <Field label="Assunto">
              <input
                type="text"
                value={parts.subject}
                onChange={(e) => setParts({ ...parts, subject: e.target.value })}
                className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-[13px] text-admin-text-primary"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}
              />
            </Field>
            <Field label="Preheader" hint="Texto curto que aparece junto ao assunto na inbox.">
              <input
                type="text"
                value={parts.preheader}
                onChange={(e) => setParts({ ...parts, preheader: e.target.value })}
                className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-[13px] text-admin-text-primary"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}
              />
            </Field>
            <Field label="Headline" hint="Título visível no topo do cartão de email.">
              <input
                type="text"
                value={parts.headline}
                onChange={(e) => setParts({ ...parts, headline: e.target.value })}
                className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-[13px] text-admin-text-primary"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}
              />
            </Field>

            <VariablesChips
              variables={data.variables}
              onInsert={(name) => {
                setParts({
                  ...parts,
                  body_html: parts.body_html + `{{${name}}}`,
                });
              }}
            />

            <Field label="Corpo (HTML)" hint="HTML interior. O cartão branco, header e footer são aplicados automaticamente.">
              <textarea
                value={parts.body_html}
                onChange={(e) => setParts({ ...parts, body_html: e.target.value })}
                rows={14}
                className="w-full rounded-md border bg-transparent px-2.5 py-2 font-mono text-[12px] text-admin-text-primary"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}
              />
            </Field>
            <Field label="Corpo (texto)" hint="Versão alternativa em texto simples para clientes que não suportam HTML.">
              <textarea
                value={parts.body_text}
                onChange={(e) => setParts({ ...parts, body_text: e.target.value })}
                rows={8}
                className="w-full rounded-md border bg-transparent px-2.5 py-2 font-mono text-[12px] text-admin-text-primary"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}
              />
            </Field>
          </div>
        </AdminCard>

        {/* Preview */}
        <AdminCard>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-eyebrow-sm text-admin-text-tertiary">
                Pré-visualização {previewing && <span className="ml-1 text-admin-text-tertiary">·  a atualizar…</span>}
              </h3>
            </div>
            <p className="m-0 text-[12px] text-admin-text-secondary">
              <span className="text-admin-text-tertiary">Assunto:</span>{" "}
              <span className="font-medium text-admin-text-primary">{previewSubject || parts.subject}</span>
            </p>
            <div
              className="overflow-hidden rounded-md border"
              style={{ borderColor: "rgb(var(--admin-border-default))" }}
            >
              <iframe
                title="Email preview"
                srcDoc={previewHtml || "<p style='font-family:sans-serif;padding:24px;color:#666'>A gerar…</p>"}
                className="block h-[720px] w-full bg-white"
              />
            </div>
            <p className="m-0 text-[11px] text-admin-text-tertiary">
              Valores das variáveis usados na pré-visualização são amostra
              ({data.variables.map((v) => `{{${v}}}`).join(", ")}).
            </p>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-eyebrow-sm text-admin-text-tertiary">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-admin-text-tertiary">{hint}</span>}
    </label>
  );
}

function VariablesChips({
  variables,
  onInsert,
}: {
  variables: string[];
  onInsert: (name: string) => void;
}) {
  if (variables.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-eyebrow-sm text-admin-text-tertiary">Variáveis disponíveis</span>
      <div className="flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onInsert(v)}
            title={`Inserir {{${v}}} no corpo HTML`}
            className="rounded-md border px-2 py-0.5 font-mono text-[11px] text-admin-text-secondary hover:bg-admin-surface-elevated"
            style={{ borderColor: "rgb(var(--admin-border-default))" }}
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}