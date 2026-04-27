/**
 * /admin/clientes — tab Clientes do admin v2.
 *
 * 3 secções: Pipeline (roxo) → Lista (verde) → Ficha (roxo).
 * Header com pesquisa + botão Exportar (acções mock por agora).
 */

import { createFileRoute } from "@tanstack/react-router";

import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { AdminSearchInput } from "@/components/admin/v2/admin-search-input";
import { AdminActionButton } from "@/components/admin/v2/admin-action-button";
import { PipelineSection } from "@/components/admin/v2/clientes/pipeline-section";
import { CustomersTableSection } from "@/components/admin/v2/clientes/customers-table-section";
import { CustomerCardSection } from "@/components/admin/v2/clientes/customer-card-section";

export const Route = createFileRoute("/admin/clientes")({
  component: ClientesPage,
});

function ClientesPage() {
  return (
    <>
      <AdminPageHeader
        title="Clientes"
        subtitle="312 leads · 125 clientes · 38 subscritores activos"
        actions={
          <>
            <AdminSearchInput placeholder="Pesquisar cliente..." />
            <AdminActionButton>Exportar</AdminActionButton>
          </>
        }
      />
      <div className="flex flex-col gap-14">
        <PipelineSection />
        <CustomersTableSection />
        <CustomerCardSection />
      </div>
    </>
  );
}