/**
 * Cockpit legado embutido — accordion colapsável que dá acesso à página
 * antiga `/admin/sistema/cockpit-legado` numa nova aba.
 *
 * Decisão técnica: link em vez de iframe para evitar duplo header e duplos
 * estilos. O cockpit legado já é uma página completa.
 */

import { useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";

import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";

export function LegacyAccessSection() {
  const [open, setOpen] = useState(false);
  const panelId = "admin-sistema-legacy-panel";

  return (
    <section>
      <AdminSectionHeader
        accent="neutral"
        title="Cockpit legado"
        info="Acesso ao painel de diagnóstico antigo. Mantido durante a transição para a nova arquitectura. Será removido quando todas as funcionalidades estiverem migradas."
      />
      <AdminCard variant="flush">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-admin-surface-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-leads-500"
        >
          <div className="flex-1">
            <p className="m-0 text-[14px] font-medium text-admin-text-primary">
              Cockpit técnico legado
            </p>
            <p className="m-0 mt-1 text-[12px] text-admin-text-tertiary">
              Diagnóstico, análises, perfis, custos, alertas e pedidos no design antigo.
              Acesso temporário durante a transição.
            </p>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-admin-text-tertiary sm:inline">
            {open ? "Recolher" : "Expandir"}
          </span>
          <ChevronRight
            size={18}
            className={`shrink-0 transition-transform ${
              open ? "text-admin-text-secondary" : "text-admin-text-tertiary"
            }`}
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          />
        </button>

        {open ? (
          <div
            id={panelId}
            role="region"
            className="border-t border-admin-border px-6 py-4"
          >
            <a
              href="/admin/sistema/cockpit-legado"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-admin-info-700 hover:underline"
            >
              Abrir cockpit legado em nova aba
              <ExternalLink size={14} />
            </a>
            <p className="m-0 mt-2 text-[11px] text-admin-text-tertiary">
              A página abre num separador novo para preservar o estado desta vista.
            </p>
          </div>
        ) : null}
      </AdminCard>
    </section>
  );
}