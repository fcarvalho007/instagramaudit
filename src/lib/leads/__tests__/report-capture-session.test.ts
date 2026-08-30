import { beforeAll, describe, expect, it } from "vitest";

import {
  CAPTURE_COOKIE_NAME,
  decodeCaptureSession,
  encodeCaptureSession,
  readCaptureLeadIdFromRequest,
} from "../report-capture-session.server";

const LEAD = "11111111-2222-4333-8444-555555555555";
const OTHER_LEAD = "99999999-2222-4333-8444-555555555555";
const CACHE_KEY = "ig:baseline:acme:v1";
const OTHER_CACHE_KEY = "ig:baseline:other:v1";

beforeAll(() => {
  process.env.SESSION_SECRET = "x".repeat(48);
});

describe("report_capture_session", () => {
  it("aceita o cookie para a cache_key correcta", () => {
    const raw = encodeCaptureSession(LEAD, CACHE_KEY);
    expect(decodeCaptureSession(raw, CACHE_KEY)).toBe(LEAD);
  });

  it("rejeita âmbito de outro relatório (sem acesso ao histórico)", () => {
    const raw = encodeCaptureSession(LEAD, CACHE_KEY);
    expect(decodeCaptureSession(raw, OTHER_CACHE_KEY)).toBeNull();
  });

  it("rejeita assinatura adulterada", () => {
    const raw = encodeCaptureSession(LEAD, CACHE_KEY);
    const parts = raw.split(".");
    const tampered = [OTHER_LEAD, parts[1], parts[2], parts[3]].join(".");
    expect(decodeCaptureSession(tampered, CACHE_KEY)).toBeNull();
  });

  it("rejeita cookies expirados (TTL de 24 h)", () => {
    const raw = encodeCaptureSession(LEAD, CACHE_KEY);
    const parts = raw.split(".");
    const old = Number(parts[2]) - 60 * 60 * 25;
    expect(
      decodeCaptureSession([parts[0], parts[1], String(old), parts[3]].join("."), CACHE_KEY),
    ).toBeNull();
  });

  it("lê o cookie a partir do Request", () => {
    const raw = encodeCaptureSession(LEAD, CACHE_KEY);
    const request = new Request("https://example.com/api", {
      headers: { cookie: `a=1; ${CAPTURE_COOKIE_NAME}=${raw}; b=2` },
    });
    expect(readCaptureLeadIdFromRequest(request, CACHE_KEY)).toBe(LEAD);
    expect(readCaptureLeadIdFromRequest(request, OTHER_CACHE_KEY)).toBeNull();
  });

  it("devolve null sem cookie", () => {
    const request = new Request("https://example.com/api");
    expect(readCaptureLeadIdFromRequest(request, CACHE_KEY)).toBeNull();
  });
});
