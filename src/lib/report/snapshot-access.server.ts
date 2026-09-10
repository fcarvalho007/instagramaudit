import { readLeadIdFromRequest } from "@/lib/leads/lead-cookie.server";
import { hasEntitlement } from "@/lib/payments/entitlements.server";
import { verifyPrintToken } from "@/lib/pdf/print-token.server";
import type { SnapshotAccessLevel } from "./sanitize-snapshot";
export async function snapshotAccess(
  request: Request,
  snapshotId?: string,
): Promise<SnapshotAccessLevel> {
  if (snapshotId) {
    const access = verifyPrintToken(
      snapshotId,
      new URL(request.url).searchParams.get("print_token"),
    );
    if (access) return access;
  }
  try {
    const lead = readLeadIdFromRequest(request);
    if (lead) return (await hasEntitlement(lead, "report_full_9")) ? "pro" : "lead";
  } catch {
    /* Fail closed. */
  }
  return "free";
}
