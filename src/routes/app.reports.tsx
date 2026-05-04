import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Os meus relatórios — InstaBench" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ReportsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Os teus relatórios
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Consulta as análises pedidas e descarrega os relatórios disponíveis.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200/70 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-400">
          Ainda não existem relatórios. Analisa um perfil para gerar o primeiro.
        </p>
      </div>
    </div>
  );
}
