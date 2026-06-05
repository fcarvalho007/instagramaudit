import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Table-aware Supabase mock.
const dedupMaybeSingle = vi.fn();
let leadConsent: boolean | null = true;
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "leads") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { marketing_consent: leadConsent },
              }),
            }),
          }),
        };
      }
      // product_events: select().eq().in().contains().limit().maybeSingle()
      return {
        select: () => ({
          eq: () => ({
            in: () => ({
              contains: () => ({
                limit: () => ({
                  maybeSingle: () => dedupMaybeSingle(),
                }),
              }),
            }),
          }),
        }),
      };
    },
  },
}));

const recordProductEvent = vi.fn(async (..._a: any[]) => undefined);
vi.mock("@/lib/tracking.server", () => ({
  recordProductEvent: (...a: any[]) => recordProductEvent(...(a as [any])),
}));

const sendReportSavedEmail = vi.fn(async (..._a: any[]) => ({}) as any);
vi.mock("../send-report-saved.server", () => ({
  sendReportSavedEmail: (...a: any[]) => sendReportSavedEmail(...(a as [any])),
}));

// Legacy sender modules should NOT be called by the new orchestrator.
const sendWelcomeBetaEmail = vi.fn((..._a: any[]) => undefined as any);
vi.mock("../send-welcome-beta.server", () => ({
  sendWelcomeBetaEmail: (...a: any[]) => sendWelcomeBetaEmail(...a),
}));
const sendReportSummaryEmail = vi.fn((..._a: any[]) => undefined as any);
vi.mock("../send-report-summary.server", () => ({
  sendReportSummaryEmail: (...a: any[]) => sendReportSummaryEmail(...a),
}));

const upsertBrevoContact = vi.fn(async (..._a: any[]) => ({ ok: true }) as any);
vi.mock("@/lib/brevo/contacts.server", () => ({
  upsertBrevoContact: (...a: any[]) => upsertBrevoContact(...a),
}));

import { sendLeadMagnetSequence } from "../lead-magnet-sequence.server";

const baseArgs = {
  leadId: "lead-1",
  reportRequestId: "rr-1",
  snapshotId: "snap-1",
  toEmail: "user@example.com",
  firstName: "Frederico",
  instagramHandle: "frederico.m.carvalho",
};

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  leadConsent = true;
  dedupMaybeSingle.mockResolvedValue({ data: null });
  sendReportSavedEmail.mockResolvedValue({
    ok: true,
    messageId: "msg-rs",
    provider: "brevo",
  });
  delete process.env.LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("sendLeadMagnetSequence (Step 3: report_saved)", () => {
  it("brand-new lead: sends report_saved once with variant=welcome", async () => {
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result).toEqual({ welcome: "sent", summary: "sent" });
    expect(sendReportSavedEmail).toHaveBeenCalledTimes(1);
    expect(sendReportSavedEmail.mock.calls[0][0].isWelcome).toBe(true);
    expect(sendWelcomeBetaEmail).not.toHaveBeenCalled();
    expect(sendReportSummaryEmail).not.toHaveBeenCalled();
    const types = recordProductEvent.mock.calls.map((c: any[]) => c[0].eventType);
    expect(types).toContain("report_saved_email_sent");
    expect(types).not.toContain("beta_welcome_email_sent");
    expect(types).not.toContain("report_summary_email_sent");
  });

  it("returning lead: sends report_saved once with variant=returning", async () => {
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: false });
    expect(result).toEqual({ welcome: "sent", summary: "sent" });
    expect(sendReportSavedEmail).toHaveBeenCalledTimes(1);
    expect(sendReportSavedEmail.mock.calls[0][0].isWelcome).toBe(false);
  });

  it("dedups against legacy or new event for same report_request_id", async () => {
    dedupMaybeSingle.mockResolvedValue({ data: { id: "evt-1" } });
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result).toEqual({
      welcome: "skipped_duplicate",
      summary: "skipped_duplicate",
    });
    expect(sendReportSavedEmail).not.toHaveBeenCalled();
  });

  it("kill-switch off: skips send and records skipped event", async () => {
    process.env.LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED = "false";
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result).toEqual({
      welcome: "skipped_disabled",
      summary: "skipped_no_data",
    });
    expect(sendReportSavedEmail).not.toHaveBeenCalled();
    const types = recordProductEvent.mock.calls.map((c: any[]) => c[0].eventType);
    expect(types).toContain("lead_magnet_sequence_skipped");
  });

  it("sender failure: records report_saved_email_failed and returns failed", async () => {
    sendReportSavedEmail.mockResolvedValue({ ok: false, reason: "BREVO_500" });
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result).toEqual({ welcome: "failed", summary: "failed" });
    const types = recordProductEvent.mock.calls.map((c: any[]) => c[0].eventType);
    expect(types).toContain("report_saved_email_failed");
  });
});