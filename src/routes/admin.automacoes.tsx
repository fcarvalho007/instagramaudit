/**
 * /admin/automacoes — layout. Só renderiza <Outlet/> para que as sub-rotas
 * (`index` = cards do ciclo beta, `templates/$key` = editor de template)
 * possam ocupar a tela. Sem Outlet, ao navegar para o editor o URL muda
 * mas a UI continua presa nos cards.
 */

import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/automacoes")({
  component: () => <Outlet />,
});