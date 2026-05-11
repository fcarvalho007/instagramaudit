import { describe, it, expect } from "vitest";
import {
  CACHE_TTL_DAYS,
  CACHE_TTL_MS,
  REPORT_RETENTION_DAYS,
  REPORT_RETENTION_MS,
  formatRetentionMessage,
  getReportExpiresAt,
  isReportExpired,
} from "../retention";
import { CACHE_TTL_MS as CACHE_TTL_MS_FROM_ANALYSIS } from "@/lib/analysis/cache";

const MS_PER_DAY = 86_400_000;

describe("retention constants", () => {
  it("usa 15 dias para retenção e cache TTL", () => {
    expect(REPORT_RETENTION_DAYS).toBe(15);
    expect(CACHE_TTL_DAYS).toBe(15);
    expect(REPORT_RETENTION_MS).toBe(15 * MS_PER_DAY);
    expect(CACHE_TTL_MS).toBe(15 * MS_PER_DAY);
  });

  it("é a única fonte de verdade — analysis/cache re-exporta o mesmo valor", () => {
    expect(CACHE_TTL_MS_FROM_ANALYSIS).toBe(CACHE_TTL_MS);
  });
});

describe("getReportExpiresAt", () => {
  it("expira exactamente 15 dias após a criação", () => {
    const created = new Date("2026-01-01T12:00:00Z");
    const expires = getReportExpiresAt(created);
    expect(expires.getTime() - created.getTime()).toBe(REPORT_RETENTION_MS);
  });

  it("aceita string ISO", () => {
    const created = "2026-01-01T12:00:00Z";
    const expires = getReportExpiresAt(created);
    expect(expires.toISOString()).toBe("2026-01-16T12:00:00.000Z");
  });
});

describe("isReportExpired", () => {
  const now = new Date("2026-01-20T12:00:00Z");

  it("relatório novo (created há 1d) não está expirado", () => {
    const expires = getReportExpiresAt(new Date(now.getTime() - MS_PER_DAY));
    expect(isReportExpired(expires, now)).toBe(false);
  });

  it("relatório antigo (created há 16d) está expirado", () => {
    const expires = getReportExpiresAt(new Date(now.getTime() - 16 * MS_PER_DAY));
    expect(isReportExpired(expires, now)).toBe(true);
  });

  it("expires no futuro = não expirado", () => {
    expect(isReportExpired(new Date(now.getTime() + 1), now)).toBe(false);
  });

  it("expires no passado = expirado", () => {
    expect(isReportExpired(new Date(now.getTime() - 1), now)).toBe(true);
  });

  it("null = não expirado (defensivo, não bloquear acesso por metadata em falta)", () => {
    expect(isReportExpired(null, now)).toBe(false);
    expect(isReportExpired(undefined, now)).toBe(false);
  });
});

describe("formatRetentionMessage", () => {
  it("comunica a janela de 15 dias em pt-PT", () => {
    expect(formatRetentionMessage()).toContain("15 dias");
  });
});