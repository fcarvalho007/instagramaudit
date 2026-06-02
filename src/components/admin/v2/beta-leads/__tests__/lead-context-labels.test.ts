import { describe, it, expect } from "vitest";

import {
  labelProfileOwnership,
  labelPurpose,
  labelSource,
  PROFILE_OWNERSHIP_LABELS,
} from "@/lib/admin/lead-context-labels";
import { COMMERCIAL_STATUS_OPTIONS } from "@/lib/admin/kanban-columns";

describe("lead-context-labels", () => {
  it("traduz own_profile, improve_content, onboarding_modal para PT", () => {
    expect(labelProfileOwnership("own_profile")).toBe("É o perfil dele");
    expect(labelPurpose("improve_content")).toBe("Melhorar conteúdo");
    expect(labelSource("onboarding_modal")).toBe("Modal de onboarding");
  });

  it("trata null/undefined com em-dash", () => {
    expect(labelProfileOwnership(null)).toBe("—");
    expect(labelPurpose(undefined)).toBe("—");
    expect(labelSource("")).toBe("—");
  });

  it("faz fallback humanizado para valores desconhecidos", () => {
    expect(labelPurpose("totally_new_value")).toBe("Totally new value");
  });

  it("não vaza nenhum valor técnico de PROFILE_OWNERSHIP para o ecrã", () => {
    for (const label of Object.values(PROFILE_OWNERSHIP_LABELS)) {
      expect(label).not.toMatch(/_/);
    }
  });
});

describe("COMMERCIAL_STATUS_OPTIONS", () => {
  it("separa estados manuais de automáticos pelo campo kind", () => {
    const manual = COMMERCIAL_STATUS_OPTIONS.filter((o) => o.kind === "manual");
    const auto = COMMERCIAL_STATUS_OPTIONS.filter((o) => o.kind === "auto");
    expect(manual.length).toBeGreaterThan(0);
    expect(auto.length).toBeGreaterThan(0);
    // Estados de decisão comercial conhecidos
    expect(manual.map((o) => o.key)).toEqual(
      expect.arrayContaining([
        "interessado",
        "potencial_cliente",
        "convertido",
        "arquivado",
      ]),
    );
    // Estados que o sistema actualiza sozinho
    expect(auto.map((o) => o.key)).toEqual(
      expect.arrayContaining([
        "novo_pedido",
        "relatorio_gerado",
        "link_enviado",
        "relatorio_visto",
        "feedback_recebido",
      ]),
    );
  });
});