/**
 * EmailLabPage — pré-visualização read-only dos templates operacionais beta.
 *
 * Importa os renderers reais de `@/lib/email/templates` e renderiza com sample
 * data fixa. Sem fetch, sem mutações, sem chamadas a Resend.
 */

import { useMemo, useState } from "react";
import { AdminPageHeader } from "../admin-page-header";
import { AdminCard } from "../admin-card";
import {
  renderRequestReceived,
  renderReportReady,
  renderFeedbackRequest,
  renderCommercialFollowup,
  type RenderedEmail,
} from "@/lib/email/templates";

const SAMPLE = {
  firstName: "Frederico",
  instagramHandle: "frederico.m.carvalho",
  reportUrl: "https://example.com/analyze/frederico.m.carvalho",
  feedbackUrl: "https://example.com/feedback/example",
  pricingOption: "monthly",
} as const;

type TemplateKey =
  | "request_received"
  | "report_ready"
  | "feedback_request"
  | "commercial_followup";

interface TemplateEntry {
  key: TemplateKey;
  title: string;
  internalName: string;
  wired: boolean;
  wiredAt: string | null;
  variables: Array<{ key: string; value: string }>;
  render: () => RenderedEmail;
  preheader?: string;
}

const TEMPLATES: TemplateEntry[] = [
  {
    key: "request_received",
    title: "Pedido recebido",
    internalName: "request_received",
    wired: true,
    wiredAt: "src/lib/beta.functions.ts (submissão de pedido beta)",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
    ],
    render: () =>
      renderRequestReceived({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
      }),
    preheader: "Vamos rever manualmente e enviamos assim que estiver pronto.",
  },
  {
    key: "report_ready",
    title: "Relatório pronto",
    internalName: "report_ready",
    wired: true,
    wiredAt: "src/routes/api/admin/send-report-link.ts",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "reportUrl", value: SAMPLE.reportUrl },
    ],
    render: () =>
      renderReportReady({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        reportUrl: SAMPLE.reportUrl,
      }),
    preheader: "Análise completa disponível para consultares.",
  },
  {
    key: "feedback_request",
    title: "Pedido de feedback",
    internalName: "feedback_request",
    wired: true,
    wiredAt: "src/routes/api/admin/send-feedback-request.ts",
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "reportUrl", value: SAMPLE.reportUrl },
      { key: "feedbackUrl", value: SAMPLE.feedbackUrl },
      { key: "reportViewed", value: "true" },
    ],
    render: () =>
      renderFeedbackRequest({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        reportUrl: SAMPLE.reportUrl,
        feedbackUrl: SAMPLE.feedbackUrl,
        reportViewed: true,
      }),
    preheader: "Duas ou três frases chegam — ajuda-nos a melhorar.",
  },
  {
    key: "commercial_followup",
    title: "Follow-up comercial",
    internalName: "commercial_followup",
    wired: false,
    wiredAt: null,
    variables: [
      { key: "firstName", value: SAMPLE.firstName },
      { key: "instagramHandle", value: SAMPLE.instagramHandle },
      { key: "pricingOption", value: SAMPLE.pricingOption },
      { key: "reportUrl", value: SAMPLE.reportUrl },
    ],
    render: () =>
      renderCommercialFollowup({
        firstName: SAMPLE.firstName,
        instagramHandle: SAMPLE.instagramHandle,
        pricingOption: SAMPLE.pricingOption,
        reportUrl: SAMPLE.reportUrl,
      }),
    preheader: "Sem pressão. Respondemos quando fizer sentido para ti.",
  },
];

export function EmailLabPage() {
  const [selectedKey, setSelectedKey] = useState<TemplateKey>("request_received");
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
