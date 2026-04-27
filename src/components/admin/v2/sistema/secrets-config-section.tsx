/**
 * Segredos e configuração — 2 cartões lado a lado:
 *   - Esquerdo: lista de segredos (nome mono + badge de presença)
 *   - Direito: configuração Apify em grid 2×2
 *
 * Sub-cartão final (full-width) descreve o modo de teste e mostra os handles
 * autorizados na allowlist.
 */

import { ArrowRight } from "lucide-react";

import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { AdminInfoTooltip } from "@/components/admin/v2/admin-info-tooltip";
import {
  MOCK_APIFY_CONFIG,
  MOCK_SECRETS,
} from "@/lib/admin/mock-data";

interface ConfigCell {
  eyebrow: string;
  value: string;
  sub: string;
}

function CardHeader({ title, info }: { title: string; info: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <h3 className="m-0 text-[16px] font-medium text-admin-text-primary">
        {title}
      </h3>
      <AdminInfoTooltip label={info} />
    </div>
  );
}

function ConfigGridCell({ cell }: { cell: ConfigCell }) {
  return (
    <div className="bg-admin-surface px-4 py-3.5">
      <p className="m-0 font-mono text-[10px] uppercase tracking-[0.08em] text-admin-text-tertiary">
        {cell.eyebrow}
      </p>
      <p className="m-0 mt-1 font-mono text-[14px] text-admin-text-primary">
        {cell.value}
      </p>
      <p className="m-0 mt-0.5 text-[11px] text-admin-text-tertiary">
        {cell.sub}
      </p>
    </div>
  );
}

export function SecretsConfigSection() {
  const apifyCells: ConfigCell[] = [
    { eyebrow: "APIFY_ENABLED",  value: MOCK_APIFY_CONFIG.enabled.value,        sub: MOCK_APIFY_CONFIG.enabled.sub        },
    { eyebrow: "MODO TESTE",     value: MOCK_APIFY_CONFIG.mode.value,           sub: MOCK_APIFY_CONFIG.mode.sub           },
    { eyebrow: "CUSTO/PERFIL",   value: MOCK_APIFY_CONFIG.costPerProfile.value, sub: MOCK_APIFY_CONFIG.costPerProfile.sub },
    { eyebrow: "CUSTO/POST",     value: MOCK_APIFY_CONFIG.costPerPost.value,    sub: MOCK_APIFY_CONFIG.costPerPost.sub    },
  ];

  return (
    <section>
      <AdminSectionHeader
        accent="neutral"
        title="Segredos e configuração"
        info="Estado dos segredos configurados (apenas presença, nunca o valor) e parâmetros operacionais do Apify."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cartão Segredos */}
        <AdminCard>
          <CardHeader
            title="Segredos"
            info="Apenas estado de presença. Os valores nunca são expostos no admin."
          />
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {MOCK_SECRETS.map((secret) => (
              <li
                key={secret.name}
                className="flex items-center justify-between rounded-lg bg-admin-surface-muted px-3.5 py-3"
              >
                <span className="font-mono text-[12px] text-admin-text-primary">
                  {secret.name}
                </span>
                {secret.configured ? (
                  <AdminBadge variant="revenue">Configurado</AdminBadge>
                ) : (
                  <AdminBadge variant="danger">Em falta</AdminBadge>
                )}
              </li>
            ))}
          </ul>
        </AdminCard>

        {/* Cartão Apify config */}
        <AdminCard>
          <CardHeader
            title="Configuração Apify"
            info="Estado do provedor e tarifas usadas para estimar o custo de cada chamada."
          />
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-admin-border">
            {apifyCells.map((cell) => (
              <ConfigGridCell key={cell.eyebrow} cell={cell} />
            ))}
          </div>
        </AdminCard>
      </div>

      {/* Sub-cartão modo teste / allowlist */}
      <AdminCard className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <h3 className="m-0 text-[14px] font-medium text-admin-text-primary">
              Modo de teste
            </h3>
            <p className="m-0 mt-1 text-[12px] text-admin-text-secondary">
              Quando activo, só os handles na allowlist disparam chamadas reais ao provider.
            </p>
          </div>
          <AdminBadge variant="revenue">Activo</AdminBadge>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {MOCK_APIFY_CONFIG.allowlist.map((handle) => (
            <span
              key={handle}
              className="inline-flex items-center rounded-md bg-admin-surface-muted px-2.5 py-1 font-mono text-[12px] text-admin-text-primary"
            >
              {handle}
            </span>
          ))}
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-admin-info-700 hover:underline"
          >
            Editar allowlist
            <ArrowRight size={12} />
          </button>
        </div>
      </AdminCard>
    </section>
  );
}