import { beforeEach, describe, expect, it } from "vitest";

import {
  QUALIFICATION_QUESTION_ID,
  clearQualificationPending,
  normalizeHandle,
  readQualification,
  writeQualification,
} from "@/lib/leads/qualification-session";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

beforeEach(() => {
  (globalThis as unknown as { window: unknown }).window = {
    sessionStorage: new MemoryStorage(),
  };
});

describe("qualification-session", () => {
  it("normaliza o handle", () => {
    expect(normalizeHandle(" @PingoDoce ")).toBe("pingodoce");
  });

  it("devolve null quando a pergunta nunca foi mostrada", () => {
    expect(readQualification("pingodoce")).toBeNull();
  });

  it("guarda uma resposta e mantém-na por handle", () => {
    writeQualification("@PingoDoce", {
      status: "answered",
      relationship: "competitor",
      pending: true,
    });
    const state = readQualification("pingodoce");
    expect(state?.status).toBe("answered");
    expect(state?.relationship).toBe("competitor");
    expect(state?.pending).toBe(true);
    expect(state?.question_id).toBe(QUALIFICATION_QUESTION_ID);
    // Escopo por handle: outro perfil continua elegível.
    expect(readQualification("continente")).toBeNull();
  });

  it("guarda o skip sem relação", () => {
    writeQualification("pingodoce", { status: "skipped" });
    const state = readQualification("pingodoce");
    expect(state?.status).toBe("skipped");
    expect(state?.relationship).toBeUndefined();
  });

  it("limpa o pending depois da sincronização", () => {
    writeQualification("pingodoce", {
      status: "answered",
      relationship: "owner",
      pending: true,
    });
    clearQualificationPending("pingodoce");
    expect(readQualification("pingodoce")?.pending).toBe(false);
  });

  it("ignora payloads corrompidos ou de outra versão", () => {
    const w = globalThis as unknown as { window: { sessionStorage: MemoryStorage } };
    w.window.sessionStorage.setItem(
      "auditprofiles:qualification:v1:pingodoce",
      JSON.stringify({ status: "answered", version: 99 }),
    );
    expect(readQualification("pingodoce")).toBeNull();
  });
});
