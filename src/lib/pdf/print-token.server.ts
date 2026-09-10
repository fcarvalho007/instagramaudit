import { createHmac, timingSafeEqual } from "node:crypto";
function secret() {
  return process.env.PDF_PRINT_SIGNING_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}
export function signPrintToken(
  snapshotId: string,
  access: "free" | "pro" = "free",
  now = Date.now(),
): string {
  const key = secret();
  if (!key) throw new Error("PDF_PRINT_SIGNING_SECRET is required for authenticated print access");
  const expires = Math.floor(now / 1000) + 600;
  const body = `${snapshotId}:${access}:${expires}`;
  return `${access}.${expires}.${createHmac("sha256", key).update(body).digest("hex")}`;
}
export function verifyPrintToken(
  snapshotId: string,
  token: unknown,
  now = Date.now(),
): "free" | "pro" | null {
  if (typeof token !== "string" || !secret()) return null;
  const [access, expires, signature] = token.split(".");
  if (
    !["free", "pro"].includes(access) ||
    !/^\d+$/.test(expires ?? "") ||
    Number(expires) < now / 1000 ||
    Number(expires) > now / 1000 + 660 ||
    !/^[a-f0-9]{64}$/.test(signature ?? "")
  )
    return null;
  const expected = createHmac("sha256", secret())
    .update(`${snapshotId}:${access}:${expires}`)
    .digest("hex");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ? (access as "free" | "pro")
    : null;
}
