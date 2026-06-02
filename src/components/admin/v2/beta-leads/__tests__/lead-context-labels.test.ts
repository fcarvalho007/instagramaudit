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
  it("separa estados em manual / payment / auto pelo campo kind", () => {
    const manual = COMMERCIAL_STATUS_OPTIONS.filter((o) => o.kind === "manual");
    const payment = COMMERCIAL_STATUS_OPTIONS.filter((o) => o.kind === "payment");
    const auto = COMMERCIAL_STATUS_OPTIONS.filter((o) => o.kind === "auto");
    expect(manual.length).toBeGreaterThan(0);
    expect(payment.length).toBeGreaterThan(0);
    expect(auto.length).toBeGreaterThan(0);

    // Decisão comercial — clicável pelo operador
    expect(manual.map((o) => o.key)).toEqual(
      expect.arrayContaining([
        "novo_pedido",
        "em_analise",
        "interessado",
        "potencial_cliente",
        "convertido",
        "arquivado",
      ]),
    );
    // Pagamento — marco com valor em €
    expect(payment.map((o) => o.key)).toEqual(
      expect.arrayContaining(["pago_report", "pago_pack5"]),
    );
    for (const opt of payment) {
      expect(opt.amount_eur).toBeGreaterThan(0);
    }
    // Automático — actualizado pelo sistema
    expect(auto.map((o) => o.key)).toEqual(
      expect.arrayContaining([
        "lead_magnet",
        "relatorio_gerado",
        "link_enviado",
        "relatorio_visto",
        "checkout_iniciado",
      ]),
    );
  });

  it("esconde feedback_* do dropdown mas mantém labels para pills legadas", () => {
    const hidden = COMMERCIAL_STATUS_OPTIONS.filter((o) => o.hidden);
    expect(hidden.map((o) => o.key)).toEqual(
      expect.arrayContaining(["feedback_pedido", "feedback_recebido"]),
    );
  });
});