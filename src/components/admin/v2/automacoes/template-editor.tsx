/**
 * Editor de templates de email (`/admin/automacoes/templates/$key`).
 *
 * Redesign 2026-05: WYSIWYG (Tiptap) com toolbar dedicada, tabs Visual /
 * HTML / Texto, preview com vista de inbox + toggle desktop/mobile, e
 * barra de ações sticky com atalho Cmd/Ctrl+S.
 *
 * O contrato com o backend mantém-se intacto: `body_html` (string) +
 * `body_text`. O wrapper (cartão branco, header e footer) continua a ser
 * aplicado pelo `wrapHtml` partilhado — o admin edita só o interior.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Editor } from "@tiptap/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Smartphone, Monitor, ChevronLeft, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/admin/fetch";
import { AdminCard } from "../admin-card";
import { RichTextEditor } from "./template-editor/rich-text-editor";
import { EditorToolbar } from "./template-editor/toolbar";
import { InboxPreviewCard } from "./template-editor/inbox-preview-card";
import { ResetConfirmDialog } from "./template-editor/reset-confirm-dialog";

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
  const [editorTab, setEditorTab] = useState<"visual" | "html" | "text">("visual");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [resetOpen, setResetOpen] = useState(false);
  const [editorRef, setEditorRef] = useState<Editor | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

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
          setLastUpdated(Date.now());
        })
        .catch(() => { /* keep previous preview */ })
        .finally(() => setPreviewing(false));
    }, 400);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [parts, templateKey]);

  const handleSave = useCallback(async () => {
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
  }, [parts, templateKey]);

  async function handleReset() {
    if (!data) return;
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
      setResetOpen(false);
      toast.success("Template reposto para o predefinido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao repor");
    } finally {
      setResetting(false);
    }
  }

  // Atalho Cmd/Ctrl+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !saving) handleSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saving, handleSave]);

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
  const variables = data.variables;

  function insertVariable(name: string) {
    const token = `{{${name}}}`;
    if (editorTab === "visual" && editorRef) {
      editorRef.chain().focus().insertContent(token).run();
    } else {
      setParts({ ...parts!, body_html: (parts?.body_html ?? "") + token });
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 md:p-6 md:pb-24">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link
          to="/admin/automacoes"
          className="inline-flex items-center gap-1 text-eyebrow-sm text-admin-text-tertiary hover:text-admin-text-primary"
        >
          <ChevronLeft className="h-3 w-3" />
          Automações
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="m-0 text-[22px] font-semibold tracking-tight text-admin-text-primary">
            {data.title}
          </h1>
          <Chip>{data.category}</Chip>
          <Chip tone={data.wired ? "success" : "muted"}>
            {data.wired ? "Wired" : "Não wired"}
          </Chip>
          <Chip tone={hasOverride ? "accent" : "muted"}>
            {hasOverride ? "Override ativo" : "Predefinido"}
          </Chip>
          <button
            type="button"
            title={
              hasOverride && data.override?.updated_at
                ? `Editado por ${data.override.updated_by_email ?? "admin"} em ${new Date(data.override.updated_at).toLocaleString("pt-PT")}\nkey: ${data.key}`
                : `Sem override (a usar predefinido)\nkey: ${data.key}`
            }
            className="inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] text-admin-text-tertiary hover:text-admin-text-primary"
            style={{ borderColor: "rgb(var(--admin-border-default))" }}
          >
            <Info className="h-3 w-3" />
            Info
          </button>
        </div>
      </div>

      {/* Honesty note: explica o que está em DB vs. o que é enviado. */}
      {!hasOverride && (
        <div
          className="rounded-md border px-3 py-2 text-[12px] text-admin-text-secondary"
          style={{
            borderColor: "rgb(var(--admin-warning-500) / 0.35)",
            background: "rgb(var(--admin-warning-500) / 0.06)",
          }}
        >
          <strong className="font-semibold text-admin-text-primary">
            Sem override em base de dados.
          </strong>{" "}
          O que segue para os subscritores é o template rico em{" "}
          <code className="font-mono text-[11px]">
            src/lib/email/templates/{data.key}.ts
          </code>{" "}
          — não o texto abaixo. Os campos abaixo são apenas o ponto de
          partida simplificado para começares a editar. Quando guardas, o
          envio passa a usar este conteúdo.
        </div>
      )}

      {/* Meta fields */}
      <AdminCard>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Assunto" hint="Linha visível na inbox.">
            <CountedInput
              value={parts.subject}
              onChange={(v) => setParts({ ...parts, subject: v })}
              max={78}
              warnAt={60}
            />
          </Field>
          <Field label="Preheader" hint="Aparece junto ao assunto na inbox.">
            <CountedInput
              value={parts.preheader}
              onChange={(v) => setParts({ ...parts, preheader: v })}
              max={120}
              warnAt={90}
            />
          </Field>
          <Field label="Headline" hint="Título no topo do cartão.">
            <input
              type="text"
              value={parts.headline}
              onChange={(e) => setParts({ ...parts, headline: e.target.value })}
              className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-[13px] text-admin-text-primary"
              style={{ borderColor: "rgb(var(--admin-border-default))" }}
            />
          </Field>
        </div>
      </AdminCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* Editor */}
        <AdminCard>
          <Tabs value={editorTab} onValueChange={(v) => setEditorTab(v as typeof editorTab)}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <TabsList className="h-8">
                <TabsTrigger value="visual" className="h-6 px-2.5 text-[11px]">Visual</TabsTrigger>
                <TabsTrigger value="html" className="h-6 px-2.5 text-[11px]">HTML</TabsTrigger>
                <TabsTrigger value="text" className="h-6 px-2.5 text-[11px]">Texto simples</TabsTrigger>
              </TabsList>
              <span className="text-[10px] text-admin-text-tertiary">
                {editorTab === "text"
                  ? "Alternativa para clientes sem HTML"
                  : "O cartão, header e footer são aplicados automaticamente"}
              </span>
            </div>

            <TabsContent value="visual" className="mt-0">
              <EditorToolbar
                editor={editorRef}
                variables={variables}
                onInsertVariable={insertVariable}
              />
              <div
                className="rounded-b-md border bg-white"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}
              >
                <RichTextEditor
                  value={parts.body_html}
                  onChange={(html) => setParts({ ...parts, body_html: html })}
                  onReady={setEditorRef}
                  placeholder="Escreve o conteúdo do email…"
                />
              </div>
            </TabsContent>

            <TabsContent value="html" className="mt-0">
              <textarea
                value={parts.body_html}
                onChange={(e) => setParts({ ...parts, body_html: e.target.value })}
                rows={18}
                spellCheck={false}
                className="w-full rounded-md border bg-white px-3 py-2.5 font-mono text-[12px] leading-[1.6] text-admin-text-primary"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}
              />
              <p className="mt-1 text-[11px] text-admin-text-tertiary">
                HTML interior bruto. Útil para colar markup pronto.
              </p>
            </TabsContent>

            <TabsContent value="text" className="mt-0">
              <textarea
                value={parts.body_text}
                onChange={(e) => setParts({ ...parts, body_text: e.target.value })}
                rows={18}
                className="w-full rounded-md border bg-white px-3 py-2.5 font-mono text-[12px] leading-[1.6] text-admin-text-primary"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}
              />
              <p className="mt-1 text-[11px] text-admin-text-tertiary">
                Versão alternativa em texto simples. Enviada como `text/plain`.
              </p>
            </TabsContent>
          </Tabs>
        </AdminCard>

        {/* Preview */}
        <div className="lg:sticky lg:top-4 self-start">
          <AdminCard>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="m-0 text-eyebrow-sm text-admin-text-tertiary">
                  Pré-visualização
                </h3>
                <div
                  className="inline-flex rounded-md border p-0.5"
                  style={{ borderColor: "rgb(var(--admin-border-default))" }}
                >
                  <DeviceBtn
                    active={previewDevice === "desktop"}
                    onClick={() => setPreviewDevice("desktop")}
                    label="Desktop"
                    icon={<Monitor className="h-3 w-3" />}
                  />
                  <DeviceBtn
                    active={previewDevice === "mobile"}
                    onClick={() => setPreviewDevice("mobile")}
                    label="Mobile"
                    icon={<Smartphone className="h-3 w-3" />}
                  />
                </div>
              </div>

              <InboxPreviewCard
                subject={previewSubject || parts.subject}
                preheader={parts.preheader}
              />

              <div
                className="overflow-hidden rounded-md border bg-admin-surface-elevated/30 p-2"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}
              >
                <div
                  className="mx-auto bg-white transition-[max-width] duration-200"
                  style={{ maxWidth: previewDevice === "mobile" ? 375 : 640 }}
                >
                  <iframe
                    title="Email preview"
                    srcDoc={previewHtml || "<p style='font-family:sans-serif;padding:24px;color:#666'>A gerar…</p>"}
                    className="block h-[640px] w-full bg-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-admin-text-tertiary">
                <span>
                  Variáveis de amostra: {variables.map((v) => `{{${v}}}`).join(", ") || "—"}
                </span>
                <span aria-live="polite">
                  {previewing ? "A atualizar…" : lastUpdated ? `Atualizado às ${new Date(lastUpdated).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
                </span>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>

      {/* Sticky action bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-4 py-2.5 backdrop-blur md:px-6"
        style={{ borderColor: "rgb(var(--admin-border-default))" }}
      >
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px]">
            <span
              aria-hidden
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                dirty ? "bg-amber-500" : hasOverride ? "bg-emerald-500" : "bg-admin-text-tertiary/40",
              )}
            />
            <span className="text-admin-text-secondary">
              {dirty
                ? "Alterações por guardar"
                : hasOverride
                  ? "Override ativo"
                  : "A usar predefinido"}
            </span>
            <span className="hidden text-[11px] text-admin-text-tertiary md:inline">
              Cmd/Ctrl+S para guardar
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              disabled={resetting || !hasOverride}
              className="rounded-md border px-3 py-1.5 text-[12px] font-medium text-admin-text-primary hover:bg-admin-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: "rgb(var(--admin-border-default))" }}
            >
              Repor predefinido
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="rounded-md px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "rgb(var(--admin-button-dark))" }}
            >
              {saving ? "A guardar…" : dirty ? "Guardar alterações" : "Guardado"}
            </button>
          </div>
        </div>
      </div>

      <ResetConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        onConfirm={handleReset}
        loading={resetting}
      />
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

function Chip({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "success" | "accent";
}) {
  const bg =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "accent"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-admin-surface-elevated text-admin-text-secondary";
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-medium",
        bg,
      )}
      style={tone === "muted" ? { borderColor: "rgb(var(--admin-border-default))" } : undefined}
    >
      {children}
    </span>
  );
}

function CountedInput({
  value,
  onChange,
  max,
  warnAt,
}: {
  value: string;
  onChange: (v: string) => void;
  max: number;
  warnAt: number;
}) {
  const len = value.length;
  const tone = len >= max ? "danger" : len >= warnAt ? "warn" : "ok";
  const toneClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "warn"
        ? "text-amber-600"
        : "text-admin-text-tertiary";
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border bg-transparent px-2.5 py-1.5 pr-12 text-[13px] text-admin-text-primary"
        style={{ borderColor: "rgb(var(--admin-border-default))" }}
      />
      <span
        className={cn(
          "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] tabular-nums",
          toneClass,
        )}
        aria-hidden
      >
        {len}/{max}
      </span>
    </div>
  );
}

function DeviceBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium",
        active
          ? "bg-admin-surface-elevated text-admin-text-primary"
          : "text-admin-text-tertiary hover:text-admin-text-primary",
      )}
    >
      {icon}
      {label}
    </button>
  );
}