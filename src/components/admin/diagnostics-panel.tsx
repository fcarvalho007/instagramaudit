import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DeliveryStatusBadge,
  PdfStatusBadge,
  RequestStatusBadge,
} from "@/components/admin/status-badge";
import type {
  DeliveryStatus,
  PdfStatus,
  RequestStatus,
} from "@/lib/admin/labels";

interface DiagnosticsResponse {
  success: true;
  secrets: {
    APIFY_TOKEN: boolean;
    RESEND_API_KEY: boolean;
    INTERNAL_API_TOKEN: boolean;
  };
  testing_mode: {
    active: boolean;
    allowlist: string[];
  };
  snapshots: {
    total: number | null;
    latest_at: string | null;
    latest_username: string | null;
    latest_status: string | null;
    latest_provider: string | null;
    latest_data_source: "fresh" | "cache" | "stale" | null;
    error: string | null;
  };
  report_requests: {
    total: number | null;
    latest_at: string | null;
    latest_request_status: string | null;
    latest_pdf_status: string | null;
    latest_delivery_status: string | null;
    latest_pdf_error: string | null;
    latest_email_error: string | null;
    error: string | null;
  };
  generated_at: string;
}

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

function dataSourceVariant(
  v: "fresh" | "cache" | "stale" | null,
): "default" | "success" | "warning" | "danger" | "accent" {
  if (v === "fresh") return "success";
  if (v === "cache") return "accent";
  if (v === "stale") return "warning";
  return "default";
}

function dataSourceLabel(v: "fresh" | "cache" | "stale" | null): string {
  if (v === "fresh") return "Fresh";
  if (v === "cache") return "Cache";
  if (v === "stale") return "Stale";
  return "—";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
      {children}
    </h2>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-content-secondary">{label}</span>
      <div className="text-right text-sm text-content-primary">{children}</div>
    </div>
  );
}

function SecretBadge({ present }: { present: boolean }) {
  return (
    <Badge variant={present ? "success" : "danger"} dot>
      {present ? "Configurado" : "Em falta"}
    </Badge>
  );
}

export function DiagnosticsPanel() {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/diagnostics");
      if (!res.ok) {
        setError(`Erro ${res.status}`);
        setData(null);
        return;
      }
      const json = (await res.json()) as DiagnosticsResponse;
      setData(json);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
            Estado
          </p>
          <h2 className="font-display text-lg text-content-primary">
            Diagnóstico de readiness
          </h2>
          {data && (
            <p className="font-mono text-[0.625rem] text-content-tertiary">
              Recolhido em {formatDate(data.generated_at)}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw />}
          onClick={() => void load()}
          disabled={loading}
        >
          Atualizar
        </Button>
      </div>

      {error && (
        <Card className="p-5">
          <p className="text-sm text-content-secondary">
            Não foi possível carregar o diagnóstico: {error}
          </p>
        </Card>
      )}

      {!error && loading && !data && (
        <Card className="p-5">
          <p className="text-sm text-content-secondary">A carregar…</p>
        </Card>
      )}

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Secrets */}
          <Card className="space-y-3 p-5">
            <SectionTitle>Segredos do servidor</SectionTitle>
            <div className="divide-y divide-border-subtle">
              <Row label="APIFY_TOKEN">
                <SecretBadge present={data.secrets.APIFY_TOKEN} />
              </Row>
              <Row label="RESEND_API_KEY">
                <SecretBadge present={data.secrets.RESEND_API_KEY} />
              </Row>
              <Row label="INTERNAL_API_TOKEN">
                <SecretBadge present={data.secrets.INTERNAL_API_TOKEN} />
              </Row>
            </div>
            <p className="font-mono text-[0.625rem] text-content-tertiary">
              Apenas presença. Os valores nunca são expostos.
            </p>
          </Card>

          {/* Testing mode */}
          <Card className="space-y-3 p-5">
            <SectionTitle>Modo de teste Apify</SectionTitle>
            <div className="divide-y divide-border-subtle">
              <Row label="Estado">
                <Badge
                  variant={data.testing_mode.active ? "warning" : "success"}
                  dot
                >
                  {data.testing_mode.active ? "Ativo" : "Desativado"}
                </Badge>
              </Row>
              <Row label="Allowlist">
                <div className="flex flex-wrap justify-end gap-1">
                  {data.testing_mode.allowlist.length === 0 ? (
                    <span className="text-content-tertiary">—</span>
                  ) : (
                    data.testing_mode.allowlist.map((h) => (
                      <span
                        key={h}
                        className="rounded border border-border-subtle bg-surface-secondary px-1.5 py-0.5 font-mono text-[0.6875rem] text-content-primary"
                      >
                        @{h}
                      </span>
                    ))
                  )}
                </div>
              </Row>
            </div>
            <p className="font-mono text-[0.625rem] text-content-tertiary">
              Para desativar: definir APIFY_TESTING_MODE=false.
            </p>
          </Card>

          {/* Snapshots */}
          <Card className="space-y-3 p-5">
            <SectionTitle>Snapshots de análise</SectionTitle>
            <div className="divide-y divide-border-subtle">
              <Row label="Total">
                <span className="font-mono">
                  {data.snapshots.total ?? "—"}
                </span>
              </Row>
              <Row label="Último perfil">
                {data.snapshots.latest_username ? (
                  <span className="font-mono">
                    @{data.snapshots.latest_username}
                  </span>
                ) : (
                  <span className="text-content-tertiary">—</span>
                )}
              </Row>
              <Row label="Atualizado">
                <span className="font-mono">
                  {formatDate(data.snapshots.latest_at)}
                </span>
              </Row>
              <Row label="Estado">
                {data.snapshots.latest_status ? (
                  <Badge variant="default">{data.snapshots.latest_status}</Badge>
                ) : (
                  <span className="text-content-tertiary">—</span>
                )}
              </Row>
              <Row label="Provedor">
                <span className="font-mono">
                  {data.snapshots.latest_provider ?? "—"}
                </span>
              </Row>
              <Row label="Frescura">
                <Badge
                  variant={dataSourceVariant(data.snapshots.latest_data_source)}
                  dot
                >
                  {dataSourceLabel(data.snapshots.latest_data_source)}
                </Badge>
              </Row>
            </div>
            {data.snapshots.error && (
              <p className="text-xs text-signal-danger">
                {data.snapshots.error}
              </p>
            )}
          </Card>

          {/* Report requests */}
          <Card className="space-y-3 p-5">
            <SectionTitle>Pedidos de relatório</SectionTitle>
            <div className="divide-y divide-border-subtle">
              <Row label="Total">
                <span className="font-mono">
                  {data.report_requests.total ?? "—"}
                </span>
              </Row>
              <Row label="Atualizado">
                <span className="font-mono">
                  {formatDate(data.report_requests.latest_at)}
                </span>
              </Row>
              <Row label="Pedido">
                {data.report_requests.latest_request_status ? (
                  <RequestStatusBadge
                    value={
                      data.report_requests.latest_request_status as RequestStatus
                    }
                  />
                ) : (
                  <span className="text-content-tertiary">—</span>
                )}
              </Row>
              <Row label="PDF">
                {data.report_requests.latest_pdf_status ? (
                  <PdfStatusBadge
                    value={data.report_requests.latest_pdf_status as PdfStatus}
                  />
                ) : (
                  <span className="text-content-tertiary">—</span>
                )}
              </Row>
              <Row label="Email">
                {data.report_requests.latest_delivery_status ? (
                  <DeliveryStatusBadge
                    value={
                      data.report_requests.latest_delivery_status as DeliveryStatus
                    }
                  />
                ) : (
                  <span className="text-content-tertiary">—</span>
                )}
              </Row>
            </div>
            {(data.report_requests.latest_pdf_error ||
              data.report_requests.latest_email_error) && (
              <div className="space-y-1 border-t border-border-subtle pt-2 text-xs">
                {data.report_requests.latest_pdf_error && (
                  <p className="text-signal-danger">
                    PDF: {data.report_requests.latest_pdf_error}
                  </p>
                )}
                {data.report_requests.latest_email_error && (
                  <p className="text-signal-danger">
                    Email: {data.report_requests.latest_email_error}
                  </p>
                )}
              </div>
            )}
            {data.report_requests.error && (
              <p className="text-xs text-signal-danger">
                {data.report_requests.error}
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
