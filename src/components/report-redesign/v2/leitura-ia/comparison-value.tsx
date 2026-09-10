import { usePublicAppConfig } from "@/lib/config/use-app-config";
/** Commercial copy follows the same rollout and window flags as the product. */
export function ComparisonValue() {
  const { comparisonV2Enabled, proWindow90dEnabled } = usePublicAppConfig();
  if (!comparisonV2Enabled) return null;
  return <p className="mt-3 text-sm text-content-secondary leading-relaxed">
    Compare até duas contas escolhidas por si, consulte publicações que sustentam a análise e receba experiências com hipótese, execução e critério de avaliação. Explore publicações dos últimos {proWindow90dEnabled ? "30 ou 90 dias" : "30 dias"}, dentro dos limites de acesso e recolha do plano. A cobertura disponível é indicada em cada conta.
  </p>;
}
