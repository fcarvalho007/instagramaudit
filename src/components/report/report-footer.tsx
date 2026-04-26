import { useReportData } from "./report-data-context";

export function ReportFooter() {
  const reportData = useReportData();
  return (
    <footer className="pt-6 mt-4 border-t border-border-subtle/30">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-content-tertiary">
          Relatório gerado a {reportData.profile.analyzedAt} · InstaBench
        </p>
        <p className="font-mono text-[11px] uppercase tracking-wide text-content-tertiary">
          Dados do Instagram público · RGPD compliant · Não afiliado com Meta
        </p>
      </div>
    </footer>
  );
}
