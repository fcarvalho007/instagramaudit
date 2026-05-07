/**
 * Beta requests table with enriched lead data and inline actions.
 */

import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import {
  BetaRequestActions,
  type BetaRequestRow,
} from "./beta-request-actions";

interface Props {
  rows: BetaRequestRow[];
  onStatusChange: (id: string, status: string, markContacted?: boolean) => void;
  onGenerateReport?: (row: BetaRequestRow) => void;
}

const STATUS_ACCENT: Record<string, "revenue" | "info" | "danger" | "signal" | "neutral" | "leads"> = {
  pending_review: "info",
  approved: "revenue",
  rejected: "danger",
  processing: "signal",
  completed: "revenue",
  archived: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  pending_review: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  processing: "Em processamento",
  completed: "Concluído",
  archived: "Arquivado",
};

const USER_TYPE_LABEL: Record<string, string> = {
  creator: "Criador",
  brand: "Marca",
  agency: "Agência",
  consultant: "Consultor",
  ecommerce: "E-commerce",
  other: "Outro",
};

const PURPOSE_LABEL: Record<string, string> = {
  improve_content: "Melhorar conteúdo",
  benchmark_competitors: "Benchmark",
  client_report: "Relatório cliente",
  grow_audience: "Crescer audiência",
  validate_brand: "Validar marca",
  other: "Outro",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BetaRequestsTable({ rows, onStatusChange, onGenerateReport }: Props) {
  if (rows.length === 0) {
    return (
      <AdminCard>
        <p className="text-center text-sm" style={{ color: "#888780" }}>
          Sem pedidos beta encontrados.
        </p>
      </AdminCard>
    );
  }

  return (
    <AdminCard variant="flush">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ color: "#2C2C2A" }}>
          <thead>
            <tr
              className="text-left"
              style={{
                borderBottom: "1px solid #E5E4DF",
                color: "#888780",
              }}
            >
              <th className="px-4 py-2.5 font-medium">Data</th>
              <th className="px-4 py-2.5 font-medium">Handle</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Nome</th>
              <th className="px-4 py-2.5 font-medium">Tipo</th>
              <th className="px-4 py-2.5 font-medium">Objetivo</th>
              <th className="px-4 py-2.5 font-medium">Perfil</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Fonte</th>
              <th className="px-4 py-2.5 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-black/[0.02]"
                style={{ borderBottom: "1px solid #F0EFEB" }}
              >
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {formatDate(row.created_at)}
                </td>
                <td className="px-4 py-2.5">
                  <a
                    href={`https://www.instagram.com/${row.instagram_username}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                    style={{ color: "#185FA5" }}
                  >
                    @{row.instagram_username}
                  </a>
                </td>
                <td className="px-4 py-2.5 max-w-[180px] truncate" title={row.lead?.email ?? ""}>
                  {row.lead?.email ?? "—"}
                </td>
                <td className="px-4 py-2.5 max-w-[120px] truncate" title={row.lead?.name ?? ""}>
                  {row.lead?.name ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  {row.lead?.user_type ? (
                    <AdminBadge variant="leads">
                      {USER_TYPE_LABEL[row.lead.user_type] ?? row.lead.user_type}
                    </AdminBadge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5 max-w-[140px] truncate">
                  {row.lead?.purpose
                    ? (PURPOSE_LABEL[row.lead.purpose] ?? row.lead.purpose)
                    : "—"}
                </td>
                <td className="px-4 py-2.5">
                  {row.lead?.profile_ownership ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <AdminBadge variant={STATUS_ACCENT[row.request_status] ?? "neutral"}>
                    {STATUS_LABEL[row.request_status] ?? row.request_status}
                  </AdminBadge>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "#888780" }}>
                  {row.request_source}
                </td>
                <td className="px-4 py-2.5">
                  <BetaRequestActions row={row} onStatusChange={onStatusChange} onGenerateReport={onGenerateReport} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}