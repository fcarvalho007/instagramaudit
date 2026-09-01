/**
 * Constrói os search params canónicos do handoff Estado B → checkout
 * Pro (`/checkout/report-full`). Mantido puro e isolado para que o
 * contrato (em especial `report_cache_key`, que liga o desbloqueio ao
 * snapshot de origem) seja testável sem React nem router.
 */
export interface ProCheckoutSearch {
  source: string;
  username?: string | undefined;
  report_cache_key?: string | undefined;
  return: string;
}

export function buildProCheckoutSearch(input: {
  source: string;
  handle: string | null;
  snapshotId: string | null;
  returnPath: string;
}): ProCheckoutSearch {
  return {
    source: input.source,
    username: input.handle ?? undefined,
    report_cache_key: input.snapshotId ?? undefined,
    return: input.returnPath,
  };
}
