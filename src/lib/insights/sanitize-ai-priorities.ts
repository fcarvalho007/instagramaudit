/** Fail closed. A value elsewhere in the payload is never evidence for this claim. */
export interface SanitizeResult {
  body: string;
  sanitized: boolean;
}
export interface PriorityClaim {
  field: string;
  value: number;
  unit: string;
}
const UNITS: Record<string, string> = {
  "profile.followers_count": "",
  "content_summary.posts_analyzed": "",
  "content_summary.average_likes": "",
  "content_summary.average_comments": "",
  "content_summary.average_engagement_rate": "%",
  "content_summary.estimated_posts_per_week": "/semana",
};
const TOKEN = /\{\{([a-zA-Z_][\w.]*)\}\}/g;
function at(payload: unknown, path: string): unknown {
  let value = payload;
  for (const key of path.split(".")) {
    if (["__proto__", "prototype", "constructor"].includes(key)) return undefined;
    value =
      value && typeof value === "object" && Object.hasOwn(value, key)
        ? (value as Record<string, unknown>)[key]
        : undefined;
  }
  return value;
}
/** Retained for diagnostics only. It is deliberately NOT used as factual validation. */
export function collectPayloadNumbers(payload: unknown): Set<string> {
  const values = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) values.add(String(v));
    else if (v && typeof v === "object") for (const child of Object.values(v)) walk(child);
  };
  walk(payload);
  return values;
}
export function sanitizeAiPriorityBody(
  body: string,
  payload: unknown,
  claims: readonly PriorityClaim[] = [],
): SanitizeResult {
  if (!body || typeof body !== "string") return { body: "", sanitized: true };
  // Legacy free prose with numbers has no field binding and cannot be certified.
  if (/\d/.test(body.replace(TOKEN, ""))) return { body: "", sanitized: true };
  let invalid = false;
  const text = body.replace(TOKEN, (_token, field: string) => {
    const claim = claims.find((c) => c.field === field);
    if (
      !claim ||
      !Object.hasOwn(UNITS, field) ||
      claim.unit !== UNITS[field] ||
      !Number.isFinite(claim.value) ||
      at(payload, field) !== claim.value
    ) {
      invalid = true;
    return "";
  }
    return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 })
    .format(claim.value)}${claim.unit}`;
  });
  if (invalid || /\{\{|\}\}/.test(text)) return { body: "", sanitized: true };
  return { body: text, sanitized: text !== body };
}
