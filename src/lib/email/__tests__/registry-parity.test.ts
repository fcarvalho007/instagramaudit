import { describe, it, expect } from "vitest";
import { EMAIL_TEMPLATES } from "@/lib/admin/email-template-registry";
import {
  getTemplateDefaultParts,
  type EmailTemplateKey,
} from "@/lib/email/templates/default-parts";

/**
 * Paridade entre o que o editor mostra (defaults derivados de
 * `getTemplateDefaultParts`) e o que o envio real produz (`renderXxx`).
 *
 * Como ambos os lados partilham o mesmo `getXxxParts` por baixo, os
 * `subject` têm de ser literalmente iguais. Se este teste falhar, alguém
 * partiu a derivação automática (provavelmente reintroduzindo cópia
 * paralela no registry).
 */
describe("email template registry parity", () => {
  for (const entry of EMAIL_TEMPLATES) {
    it(`${entry.key}: default subject matches renderXxx().subject`, () => {
      const rendered = entry.render();
      const defaults = getTemplateDefaultParts(entry.key as EmailTemplateKey);
      expect(defaults.subject).toBe(rendered.subject);
    });
  }
});