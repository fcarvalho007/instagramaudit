import { describe, it, expect } from "vitest";
import {
  CACHE_REUSE_MAX_HOURS,
  CACHE_REUSE_MAX_MS,
  CACHE_TTL_DAYS,
  CACHE_TTL_MS,
  REFRESH_BUTTON_AFTER_HOURS,
  REFRESH_BUTTON_AFTER_MS,
  REPORT_RETENTION_DAYS,
  REPORT_RETENTION_MS,
  formatRetentionMessage,
  getReportExpiresAt,
  getReportSnapshotExpiresAt,
  isReportExpired,
  isReportSnapshotExpired,
} from "../retention";
import { CACHE_TTL_MS as CACHE_TTL_MS_FROM_ANALYSIS } from "@/lib/analysis/cache";

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

describe("retention constants", () => {
  it("usa 15 dias para retenção / janela de histórico", () => {
    expect(REPORT_RETENTION_DAYS).toBe(15);
    expect(CACHE_TTL_DAYS).toBe(15);
    expect(REPORT_RETENTION_MS).toBe(15 * MS_PER_DAY);
    expect(CACHE_TTL_MS).toBe(15 * MS_PER_DAY);
  });

  it("cache de reutilização é 24h / botão refresh aparece após 12h", () => {
    expect(CACHE_REUSE_MAX_HOURS).toBe(24);
    expect(CACHE_REUSE_MAX_MS).toBe(24 * MS_PER_HOUR);
    expect(REFRESH_BUTTON_AFTER_HOURS).toBe(12);
    expect(REFRESH_BUTTON_AFTER_MS).toBe(12 * MS_PER_HOUR);
  });

  it("analysis/cache re-exporta a janela de reutilização de 24h", () => {
    expect(CACHE_TTL_MS_FROM_ANALYSIS).toBe(CACHE_REUSE_MAX_MS);
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

describe("report snapshot helpers", () => {
  it("getReportSnapshotExpiresAt segue REPORT_RETENTION_DAYS", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const expires = getReportSnapshotExpiresAt(created);
    expect(expires.getTime() - created.getTime()).toBe(REPORT_RETENTION_MS);
  });

  it("isReportSnapshotExpired espelha isReportExpired", () => {
    const now = new Date("2026-01-20T00:00:00Z");
    expect(isReportSnapshotExpired(new Date(now.getTime() + 1), now)).toBe(false);
    expect(isReportSnapshotExpired(new Date(now.getTime() - 1), now)).toBe(true);
    expect(isReportSnapshotExpired(null, now)).toBe(false);
  });
});