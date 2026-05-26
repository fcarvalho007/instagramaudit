/**
 * /admin/automacoes — visualização read-only do ciclo de vida beta.
 */

import { createFileRoute } from "@tanstack/react-router";
import { AutomationFlowPage } from "@/components/admin/v2/automacoes/automation-flow-page";

export const Route = createFileRoute("/admin/automacoes/")({
  component: AutomationFlowPage,
});