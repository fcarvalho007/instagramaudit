/**
 * EmailLabPage — pré-visualização read-only dos templates operacionais beta.
 *
 * Importa os renderers reais de `@/lib/email/templates` e renderiza com sample
 * data fixa. Sem fetch, sem mutações, sem chamadas a Resend.
 */

import { useMemo, useState } from "react";
import { AdminPageHeader } from "../admin-page-header";
import { AdminCard } from "../admin-card";
import type { RenderedEmail } from "@/lib/email/templates";
import {
  EMAIL_TEMPLATES as TEMPLATES,
  type EmailTemplateKey as TemplateKey,
} from "@/lib/admin/email-template-registry";

export function EmailLabPage() {
  const [selectedKey, setSelectedKey] = useState<TemplateKey>(() => {
    if (typeof window === "undefined") return "request_received";
    const url = new URL(window.location.href);
    const t = url.searchParams.get("template") as TemplateKey | null;
    if (t && TEMPLATES.some((x) => x.key === t)) return t;
    return "request_received";
  });
  const [previewMode, setPreviewMode] = useState<"html" | "text">("html");

  const selected = TEMPLATES.find((t) => t.key === selectedKey)!;
  const rendered = useMemo<RenderedEmail | { error: string }>(() => {
    try {
      return selected.render();
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }, [selected]);

  const renderError = "error" in rendered ? rendered.error : null;

  return (
    <>
      <AdminPageHeader
        title="Email Lab"
        subtitle="Pré-visualização dos templates operacionais com dados de exemplo. Nada é enviado a partir desta página."
      />

      <div className="flex flex-col gap-6">
        <ReadOnlyBanner />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          {/* Lista */}
          <div className="flex flex-col gap-2">
            {TEMPLATES.map((t) => {
              const active = t.key === selectedKey;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelectedKey(t.key)}
                  className="rounded-lg border px-3 py-3 text-left transition-colors"
                  style={{
                    borderColor: active
                      ? "rgb(var(--admin-accent-500) / 0.6)"
                      : "rgb(var(--admin-border-default))",
                    background: active
                      ? "rgb(var(--admin-accent-500) / 0.06)"
                      : "rgb(var(--admin-surface-base))",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-admin-text-primary">
                      {t.title}
                    </span>
                    <WiringBadge wired={t.wired} />
                  </div>
                  <p className="mt-1 truncate text-[12px] text-admin-text-tertiary">
                    {t.internalName}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Detalhe */}
          <div className="flex flex-col gap-4 min-w-0">
            <AdminCard>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-admin-text-primary">
                    {selected.title}
                  </h2>
                  <WiringBadge wired={selected.wired} />
                </div>
                <MetaRow label="Nome interno" value={selected.internalName} mono />
                <MetaRow
                  label="Subject"
                  value={renderError ? "—" : (rendered as RenderedEmail).subject}
                />
                {selected.preheader ? (
                  <MetaRow label="Preheader" value={selected.preheader} />
                ) : null}
                <MetaRow
                  label="Wiring"
                  value={
                    selected.wiredAt ?? "Não está ligado a nenhum endpoint (orphan)"
                  }
                  mono={Boolean(selected.wiredAt)}
                />
              </div>
            </AdminCard>

            <AdminCard>
              <h3 className="mb-3 text-[13px] font-semibold text-admin-text-primary">
                Variáveis de exemplo
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <tbody>
                    {selected.variables.map((v) => (
                      <tr
                        key={v.key}
                        className="border-t"
                        style={{ borderColor: "rgb(var(--admin-border-default))" }}
                      >
                        <td className="py-2 pr-4 font-mono text-admin-text-secondary whitespace-nowrap">
                          {v.key}
                        </td>
                        <td className="py-2 font-mono text-admin-text-primary break-all">
                          {v.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>

            <AdminCard>
              <div className="mb-3 flex items-center gap-1 rounded-md border p-1 w-fit"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}>
                {(["html", "text"] as const).map((mode) => {
                  const active = mode === previewMode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPreviewMode(mode)}
                      className="rounded px-3 py-1 text-[12px] font-medium transition-colors"
                      style={{
                        background: active
                          ? "rgb(var(--admin-accent-500))"
                          : "transparent",
                        color: active
                          ? "rgb(var(--admin-accent-foreground, 255 255 255))"
                          : "rgb(var(--admin-text-secondary))",
                      }}
                    >
                      {mode === "html" ? "HTML" : "Texto"}
                    </button>
                  );
                })}
              </div>

              {renderError ? (
                <p className="text-[13px] text-admin-danger-500">
                  Erro ao renderizar template: {renderError}
                </p>
              ) : previewMode === "html" ? (
                <iframe
                  key={selected.key}
                  srcDoc={(rendered as RenderedEmail).html}
                  sandbox=""
                  title={`Pré-visualização HTML — ${selected.title}`}
                  className="w-full rounded border"
                  style={{
                    height: "640px",
                    borderColor: "rgb(var(--admin-border-default))",
                    background: "#ffffff",
                  }}
                />
              ) : (
                <pre
                  className="max-h-[480px] overflow-auto rounded border p-3 font-mono text-[12px] leading-relaxed text-admin-text-primary whitespace-pre-wrap break-words"
                  style={{
                    borderColor: "rgb(var(--admin-border-default))",
                    background: "rgb(var(--admin-surface-base))",
                  }}
                >
                  {(rendered as RenderedEmail).text}
                </pre>
              )}
            </AdminCard>
          </div>
        </div>
      </div>
    </>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="w-28 shrink-0 text-[11px] uppercase tracking-wide text-admin-text-tertiary">
        {label}
      </span>
      <span
        className={`text-[13px] text-admin-text-primary break-words ${mono ? "font-mono text-[12px]" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function WiringBadge({ wired }: { wired: boolean }) {
  return wired ? (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        background: "rgb(var(--admin-success-500) / 0.12)",
        color: "rgb(var(--admin-success-500))",
      }}
    >
      Wired
    </span>
  ) : (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        background: "rgb(var(--admin-warning-500) / 0.12)",
        color: "rgb(var(--admin-warning-500))",
      }}
    >
      Orphan
    </span>
  );
}

function ReadOnlyBanner() {
  return (
    <div
      className="rounded-lg border px-4 py-2.5 text-[12px]"
      style={{
        borderColor: "rgb(var(--admin-info-500) / 0.3)",
        background: "rgb(var(--admin-info-500) / 0.06)",
        color: "rgb(var(--admin-info-500))",
      }}
    >
      <strong className="font-semibold">Modo visualização.</strong>{" "}
      <span className="text-admin-text-secondary">
        Nenhum email é enviado a partir desta página. Os envios reais continuam
        a acontecer em <em>Leads</em> e nas automações operacionais.
      </span>
    </div>
  );
}
