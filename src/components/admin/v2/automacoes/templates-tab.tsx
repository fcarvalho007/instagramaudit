/**
 * TemplatesTab — lista os templates beta com estado wired/orphan.
 * Edição não implementada — botão "Editar" desativado ("em breve").
 */

import { AdminCard } from "../admin-card";
import { EMAIL_TEMPLATES } from "@/lib/admin/email-template-registry";

export function TemplatesTab() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {EMAIL_TEMPLATES.map((t) => (
        <AdminCard key={t.key}>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="m-0 text-[14px] font-semibold text-admin-text-primary">
                  {t.title}
                </h3>
                <p className="m-0 truncate font-mono text-[11px] text-admin-text-tertiary">
                  {t.internalName}
                </p>
              </div>
              <WiringBadge wired={t.wired} />
            </div>

            {t.preheader && (
              <p className="m-0 text-[12px] text-admin-text-secondary line-clamp-2">
                {t.preheader}
              </p>
            )}

            <div className="flex flex-wrap gap-1">
              {t.variables.map((v) => (
                <span
                  key={v.key}
                  className="rounded-md border px-1.5 py-0.5 font-mono text-[10px] text-admin-text-secondary"
                  style={{ borderColor: "rgb(var(--admin-border-default))" }}
                >
                  {v.key}
                </span>
              ))}
            </div>

            <p className="m-0 text-[11px] text-admin-text-tertiary">
              {t.wired
                ? `Wired em ${t.wiredAt}`
                : "Não está ligado a nenhum endpoint (orphan)."}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/admin/email-lab?template=${t.key}`}
                className="rounded-md border px-2.5 py-1 text-[12px] font-medium text-admin-text-primary hover:bg-admin-surface-elevated"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}
              >
                Pré-visualizar →
              </a>
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-md border px-2.5 py-1 text-[12px] font-medium text-admin-text-tertiary opacity-60"
                style={{ borderColor: "rgb(var(--admin-border-default))" }}
                title="Edição em breve"
              >
                Editar (em breve)
              </button>
            </div>
          </div>
        </AdminCard>
      ))}
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