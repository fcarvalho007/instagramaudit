/**
 * /admin → redirect para /admin/visao-geral.
 */

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/visao-geral" });
  },
});