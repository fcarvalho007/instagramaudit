/** Opt-in rollout. Existing stored reports remain readable with the flag off. */
export function isComparisonV2Enabled(): boolean {
  return process.env.COMPARISON_V2_ENABLED === "true";
}
