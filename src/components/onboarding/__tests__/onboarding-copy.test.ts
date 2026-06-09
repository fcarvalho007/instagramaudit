/**
 * Copy regression for the password-mode onboarding modal.
 *
 * Light-weight: we assert on the i18n bundle + the modal source instead
 * of mounting the full RTL tree (which would require mocking Supabase,
 * i18next, the Lovable connector, react-router-dom and the onboarding
 * draft hook). Catches the high-value regressions without the cost.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import gatePt from "@/i18n/locales/pt/gate.json";

const MODAL_SRC = readFileSync(
  resolve(process.cwd(), "src/components/onboarding/onboarding-modal.tsx"),
  "utf8",
);

describe("onboarding modal copy (password mode)", () => {
  it("new-user navy panel uses the private-account narrative", () => {
    const left = gatePt.onboarding.final.left as Record<string, unknown>;
    expect(left.title).toBe("A tua área privada");
    expect(left.subtitle).toMatch(/conta segura/);
    expect(left.securityNote).toMatch(/nunca é enviada por email/);
    const bullets = left.bullets as Record<string, string>;
    expect(bullets.save).toBe("Relatório guardado na tua conta");
    expect(bullets.passwordProtected).toBe(
      "Acesso protegido por palavra-passe",
    );
    expect(bullets.privateData).toBe(
      "Dados privados e associados ao teu email",
    );
    expect(bullets.returnAny).toBe(
      "Podes voltar aos relatórios quando quiseres",
    );
  });

  it("no phone field is rendered in the final step", () => {
    // Telemóvel input + label were removed from FinalStepBody. The
    // orphan i18n keys are kept in gate.json for translation continuity
    // but must not be referenced anywhere in the modal source.
    expect(MODAL_SRC).not.toMatch(/onb-phone/);
    expect(MODAL_SRC).not.toMatch(/phoneLabel|phonePlaceholder|phoneHint/);
  });

  it("no confirm-password field is rendered or registered", () => {
    expect(MODAL_SRC).not.toMatch(/confirm_password/);
    expect(MODAL_SRC).not.toMatch(/onb-confirm-password/);
    expect(MODAL_SRC).not.toMatch(/Confirmar palavra-passe/);
  });

  it("does not contain magic-link / email-verification copy", () => {
    // Password mode never displays these phrases. Catches regressions
    // from copying old fragments back in. Note: we scan for user-facing
    // strings only — code-level references to the legacy `magic_link`
    // auth-mode literal are tolerated.
    expect(MODAL_SRC).not.toMatch(/após confirmação do email/i);
    expect(MODAL_SRC).not.toMatch(/verifica o teu email/i);
    expect(MODAL_SRC).not.toMatch(/Enviámos um link/i);
    expect(MODAL_SRC).not.toMatch(/link mágico/i);
  });

  it("LoginPanel renders the reassurance copy and updated CTA", () => {
    expect(MODAL_SRC).toMatch(/ENTRAR NA CONTA/);
    expect(MODAL_SRC).toMatch(/Já existe uma conta com este email/);
    expect(MODAL_SRC).toMatch(/Entrar e abrir relatório/);
    expect(MODAL_SRC).toMatch(
      /Só o titular da conta consegue aceder aos relatórios guardados\./,
    );
    // Reset link must be present.
    expect(MODAL_SRC).toMatch(/\/reset-password\?email=/);
  });
});