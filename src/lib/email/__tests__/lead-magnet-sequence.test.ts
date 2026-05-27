import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---- Supabase mock: table-aware ------------------------------------------
// `from("leads")` → marketing_consent lookup chain.
// `from("product_events")` → dedup chain used by eventAlreadyEmitted.
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
      // product_events dedup
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
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

// ---- recordProductEvent --------------------------------------------------
const recordProductEvent = vi.fn(async (..._a: any[]) => undefined);
vi.mock("@/lib/tracking.server", () => ({
  recordProductEvent: (...a: any[]) => recordProductEvent(...(a as [any])),
}));

// ---- senders -------------------------------------------------------------
const sendWelcomeBetaEmail = vi.fn(async (..._a: any[]) => ({}) as any);
vi.mock("../send-welcome-beta.server", () => ({
  sendWelcomeBetaEmail: (...a: any[]) => sendWelcomeBetaEmail(...(a as [any])),
}));

const sendReportSummaryEmail = vi.fn(async (..._a: any[]) => ({}) as any);
vi.mock("../send-report-summary.server", () => ({
  sendReportSummaryEmail: (...a: any[]) => sendReportSummaryEmail(...(a as [any])),
}));

// ---- Brevo stamp ---------------------------------------------------------
const upsertBrevoContact = vi.fn(async (..._a: any[]) => ({ ok: true }) as any);
vi.mock("@/lib/brevo/contacts.server", () => ({
  upsertBrevoContact: (...a: any[]) => upsertBrevoContact(...(a as [any])),
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

function flushMicrotasks() {
  return new Promise((r) => setTimeout(r, 0));
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  leadConsent = true;
  dedupMaybeSingle.mockResolvedValue({ data: null });
  sendWelcomeBetaEmail.mockResolvedValue({
    ok: true,
    messageId: "msg-w",
    provider: "brevo",
  });
  sendReportSummaryEmail.mockResolvedValue({
    ok: true,
    messageId: "msg-s",
    provider: "brevo",
  });
  delete process.env.LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("sendLeadMagnetSequence", () => {
  it("brand-new lead: sends both emails and records both events", async () => {
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result).toEqual({ welcome: "sent", summary: "sent" });
    expect(sendWelcomeBetaEmail).toHaveBeenCalledTimes(1);
    expect(sendReportSummaryEmail).toHaveBeenCalledTimes(1);
    const types = recordProductEvent.mock.calls.map((c: any[]) => c[0].eventType);
    expect(types).toContain("beta_welcome_email_sent");
    expect(types).toContain("report_summary_email_sent");
  });

  it("returning lead: skips welcome, sends summary", async () => {
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: false });
    expect(result.welcome).toBe("skipped_disabled");
    expect(result.summary).toBe("sent");
    expect(sendWelcomeBetaEmail).not.toHaveBeenCalled();
    expect(sendReportSummaryEmail).toHaveBeenCalledTimes(1);
  });

  it("duplicate unlock: skips both senders when events already exist", async () => {
    dedupMaybeSingle.mockResolvedValue({ data: { id: "evt-prev" } });
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result).toEqual({
      welcome: "skipped_duplicate",
      summary: "skipped_duplicate",
    });
    expect(sendWelcomeBetaEmail).not.toHaveBeenCalled();
    expect(sendReportSummaryEmail).not.toHaveBeenCalled();
    expect(recordProductEvent).not.toHaveBeenCalled();
  });

  it("welcome failure does not prevent summary", async () => {
    sendWelcomeBetaEmail.mockResolvedValue({ ok: false, reason: "PROVIDER_DOWN" });
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result.welcome).toBe("failed");
    expect(result.summary).toBe("sent");
    const types = recordProductEvent.mock.calls.map((c: any[]) => c[0].eventType);
    expect(types).toContain("beta_welcome_email_failed");
    expect(types).toContain("report_summary_email_sent");
  });

  it("missing snapshot data: summary skipped without failure event", async () => {
    sendReportSummaryEmail.mockResolvedValue({ ok: false, reason: "NO_DATA" });
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result.summary).toBe("skipped_no_data");
    const types = recordProductEvent.mock.calls.map((c: any[]) => c[0].eventType);
    expect(types).toContain("report_summary_skipped_no_data");
    expect(types).not.toContain("report_summary_email_failed");
  });

  it("welcome already sent, summary new: only summary sends", async () => {
    dedupMaybeSingle.mockImplementation(() => {
      const call = dedupMaybeSingle.mock.calls.length;
      // 1st call = welcome dedup → duplicate; 2nd call = summary dedup → none
      return Promise.resolve(call === 1 ? { data: { id: "evt" } } : { data: null });
    });
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result.welcome).toBe("skipped_duplicate");
    expect(result.summary).toBe("sent");
    expect(sendWelcomeBetaEmail).not.toHaveBeenCalled();
    expect(sendReportSummaryEmail).toHaveBeenCalledTimes(1);
  });

  it("welcome OK triggers Brevo BETA_WELCOMED_AT stamp", async () => {
    await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    await flushMicrotasks();
    expect(upsertBrevoContact).toHaveBeenCalledTimes(1);
    const call = (upsertBrevoContact.mock.calls[0] as any[])[0];
    expect(call.email).toBe("user@example.com");
    expect(call.attributes).toHaveProperty("BETA_WELCOMED_AT");
  });

  it("kill switch: skips entire sequence when LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED='false'", async () => {
    process.env.LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED = "false";
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result).toEqual({
      welcome: "skipped_disabled",
      summary: "skipped_no_data",
    });
    expect(sendWelcomeBetaEmail).not.toHaveBeenCalled();
    expect(sendReportSummaryEmail).not.toHaveBeenCalled();
    const types = recordProductEvent.mock.calls.map((c: any[]) => c[0].eventType);
    expect(types).toContain("lead_magnet_sequence_skipped");
  });

  it("kill switch unset: defaults to ON and sends sequence", async () => {
    delete process.env.LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED;
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result).toEqual({ welcome: "sent", summary: "sent" });
    expect(sendWelcomeBetaEmail).toHaveBeenCalledTimes(1);
    expect(sendReportSummaryEmail).toHaveBeenCalledTimes(1);
  });

  it("transactional delivery: sends both emails even when marketing_consent=false, with flag in metadata", async () => {
    leadConsent = false;
    const result = await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    expect(result).toEqual({ welcome: "sent", summary: "sent" });
    expect(sendWelcomeBetaEmail).toHaveBeenCalledTimes(1);
    expect(sendReportSummaryEmail).toHaveBeenCalledTimes(1);
    const types = recordProductEvent.mock.calls.map((c: any[]) => c[0].eventType);
    expect(types).not.toContain("lead_magnet_sequence_skipped");
    const welcomeEvt = recordProductEvent.mock.calls.find(
      (c: any[]) => c[0].eventType === "beta_welcome_email_sent",
    );
    const summaryEvt = recordProductEvent.mock.calls.find(
      (c: any[]) => c[0].eventType === "report_summary_email_sent",
    );
    expect(welcomeEvt![0].metadata).toMatchObject({
      transactional_delivery: true,
      marketing_consent: false,
    });
    expect(summaryEvt![0].metadata).toMatchObject({
      transactional_delivery: true,
      marketing_consent: false,
    });
  });

  it("marketing_consent=true: metadata records marketing_consent: true", async () => {
    leadConsent = true;
    await sendLeadMagnetSequence({ ...baseArgs, sendWelcome: true });
    const summaryEvt = recordProductEvent.mock.calls.find(
      (c: any[]) => c[0].eventType === "report_summary_email_sent",
    );
    expect(summaryEvt![0].metadata).toMatchObject({
      transactional_delivery: true,
      marketing_consent: true,
    });
  });

  it("personalization: forwards firstName only — never phone or fullName", async () => {
    await sendLeadMagnetSequence({
      ...baseArgs,
      firstName: "Ana",
      sendWelcome: true,
    });
    const welcomeArg = sendWelcomeBetaEmail.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    const summaryArg = sendReportSummaryEmail.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(welcomeArg.firstName).toBe("Ana");
    expect(summaryArg.firstName).toBe("Ana");
    // Sequence MUST NOT receive or forward phone/fullName/lastName.
    expect(welcomeArg).not.toHaveProperty("phone");
    expect(welcomeArg).not.toHaveProperty("fullName");
    expect(welcomeArg).not.toHaveProperty("lastName");
    expect(summaryArg).not.toHaveProperty("phone");
    expect(summaryArg).not.toHaveProperty("fullName");
    expect(summaryArg).not.toHaveProperty("lastName");
  });
});