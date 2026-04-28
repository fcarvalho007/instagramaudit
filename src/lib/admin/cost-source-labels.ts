/**
 * Pure pt-PT labels for cost classification displayed in the admin
 * cockpit. Client-safe (no DB, no server APIs) so panels and the
 * snapshot preview can both import them.
 */

export type CostSource =
  | "provider_reported"
  | "estimated"
  | "calculated"
  | "cache_hit"
  | "not_used";

export type CostConfidence =
  | "confirmado"
  | "parcial"
  | "estimado"
  | "sem_custos";

export type ProviderKey = "apify" | "dataforseo" | "openai";

export function costSourceLabel(value: CostSource): string {
  switch (value) {
    case "provider_reported":
      return "Reportado pelo provedor";
    case "estimated":
      return "Estimado";
    case "calculated":
      return "Calculado por tokens";
    case "cache_hit":
      return "Cache (sem chamada)";
    case "not_used":
      return "Não utilizado";
  }
}

export function costConfidenceLabel(value: CostConfidence): string {
  switch (value) {
    case "confirmado":
      return "Confirmado";
    case "parcial":
      return "Parcial";
    case "estimado":
      return "Estimado";
    case "sem_custos":
      return "Sem custos externos";
  }
}

export function providerLabel(provider: ProviderKey): string {
  switch (provider) {
    case "apify":
      return "Apify";
    case "dataforseo":
      return "DataForSEO";
    case "openai":
      return "OpenAI";
  }
}
