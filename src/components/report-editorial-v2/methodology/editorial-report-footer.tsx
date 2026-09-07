import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { normaliseCollectedAt } from "./methodology-data";

/**
 * Rodapé do relatório — camada de apresentação Editorial V2.
 *
 * Não repete a navegação institucional: a página do relatório já
 * apresenta o rodapé global do site com Preços/Privacidade/Termos.
 *
 * Reutiliza a redacção legal já aprovada em produção. A data vem do
 * snapshot real; o ano vem do relógio do cliente, como no rodapé
 * institucional.
 */
export function EditorialReportFooter({ result }: { result: AdapterResult }) {
  const collectedAt = normaliseCollectedAt(result.data.profile.analyzedAt);
  const year = new Date().getFullYear();

  return (
    <footer className="ev2-footer">
      <div className="ev2-wrap">
        <div className="ev2-footer__inner">
          <div className="min-w-0">
            <p className="ev2-footer__brand">AuditProfiles</p>
            <p className="ev2-footer__meta" suppressHydrationWarning>
              {collectedAt ? `Dados recolhidos em ${collectedAt}. ` : ""}
              Dados do Instagram público · RGPD compliant · Não afiliado com
              Meta
            </p>
          </div>
        </div>
        <p className="ev2-footer__copy" suppressHydrationWarning>
          © {year} AuditProfiles
        </p>
      </div>
    </footer>
  );
}
