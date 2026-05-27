/**
 * Phone normalisation helper biased toward Portuguese mobile numbers,
 * with a safe international passthrough.
 *
 * Rules (applied in order):
 * 1. Trim + strip everything except digits and a leading `+`.
 * 2. If the input already starts with `+`, keep it and the digits.
 * 3. If the digits start with `00`, replace `00` with `+`.
 * 4. If the digits are 9 chars and start with `9` (PT mobile), prefix `+351`.
 * 5. If the digits are 12 chars and start with `351`, prefix `+`.
 * 6. Otherwise return null — the caller (Brevo sync) will skip the SMS
 *    attribute but still sync the contact and log `PHONE_NOT_E164`.
 *
 * Never throws. Never used to reject a lead — phone is optional.
 */
export function normalizePhonePT(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (hasPlus) {
    return digits.length >= 8 ? `+${digits}` : null;
  }
  if (digits.startsWith("00") && digits.length >= 10) {
    return `+${digits.slice(2)}`;
  }
  if (digits.length === 9 && digits.startsWith("9")) {
    return `+351${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("351")) {
    return `+${digits}`;
  }
  return null;
}