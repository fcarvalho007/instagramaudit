import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  VERIFICATION_TOKEN_TTL_SECONDS,
  signVerificationToken,
  verifyVerificationToken,
} from "../verification-token.server";

const prevSecret = process.env.EMAIL_VERIFICATION_SECRET;

beforeAll(() => {
  process.env.EMAIL_VERIFICATION_SECRET = "test-secret-please-rotate-in-prod";
});

afterAll(() => {
  if (prevSecret === undefined) delete process.env.EMAIL_VERIFICATION_SECRET;
  else process.env.EMAIL_VERIFICATION_SECRET = prevSecret;
});

describe("verification-token", () => {
  it("assina e valida tokens válidos com handle e email lowercased", () => {
    const token = signVerificationToken({
      leadId: "00000000-0000-0000-0000-000000000001",
      email: "AnA@Example.COM",
      handle: "frederico.m.carvalho",
    });
    const verified = verifyVerificationToken(token);
    expect(verified).not.toBeNull();
    expect(verified!.leadId).toBe("00000000-0000-0000-0000-000000000001");
    expect(verified!.email).toBe("ana@example.com");
    expect(verified!.handle).toBe("frederico.m.carvalho");
  });

  it("rejeita tokens malformados", () => {
    expect(verifyVerificationToken("")).toBeNull();
    expect(verifyVerificationToken("not-a-token")).toBeNull();
    expect(verifyVerificationToken("aaa.bbb.ccc")).toBeNull();
  });

  it("rejeita tokens com assinatura adulterada", () => {
    const token = signVerificationToken({
      leadId: "00000000-0000-0000-0000-000000000002",
      email: "joao@example.com",
    });
    const [payload] = token.split(".");
    const tampered = `${payload}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`;
    expect(verifyVerificationToken(tampered)).toBeNull();
  });

  it("rejeita tokens expirados", () => {
    const now = Date.now();
    const token = signVerificationToken(
      {
        leadId: "00000000-0000-0000-0000-000000000003",
        email: "expired@example.com",
      },
      now,
    );
    const future = now + (VERIFICATION_TOKEN_TTL_SECONDS + 60) * 1000;
    expect(verifyVerificationToken(token, future)).toBeNull();
  });
});