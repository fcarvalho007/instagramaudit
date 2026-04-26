/**
 * Pedidos de relatório — wrapper fino para reutilizar o RequestList +
 * RequestDetailSheet existentes dentro do CockpitShell.
 */

import { useState } from "react";

import {
  RequestList,
  type AdminRequestRow,
} from "@/components/admin/request-list";
import { RequestDetailSheet } from "@/components/admin/request-detail-sheet";

export function RequestsPanel() {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <RequestList
        onSelect={(row: AdminRequestRow) => setSelectedRequestId(row.id)}
        refreshKey={refreshKey}
      />
      <RequestDetailSheet
        reportRequestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}