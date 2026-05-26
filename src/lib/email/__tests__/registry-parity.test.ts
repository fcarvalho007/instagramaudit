import { describe, it, expect } from "vitest";
import { EMAIL_TEMPLATES } from "@/lib/admin/email-template-registry";

/**
 * Paridade entre o que o editor mostra (registry.defaultParts.subject) e o
 * que o envio real produz (renderXxx().subject).
 *
 * Se este teste falhar, ou o template em `src/lib/email/templates/<key>.ts`
 * mudou de subject e o registry ficou desalinhado, ou vice-versa. Atualizar
 * ambos OU implementar a derivação automática (Opção A do plano de auditoria).
 *
 * Nota: comparamos apenas o `subject` porque o body do registry é uma
 * versão simplificada por design (ponto de partida para o editor). O HTML
 * real só é usado quando o admin guarda um override em DB — caso contrário
 * o sender usa o `renderXxx` rico. O editor já comunica isso ao admin via
 * banner amarelo de "Sem override".
 */
describe("email template registry parity", () => {
  for (const entry of EMAIL_TEMPLATES) {
    it(`${entry.key}: defaultParts.subject matches renderXxx().subject`, () => {
      const rendered = entry.render();
      // O subject do renderXxx é literal; o do registry pode ter {{var}}.
      // Substituímos com os valores SAMPLE usados no render para comparar.
      const sampleVars: Record<string, string> = Object.fromEntries(
        entry.variables.map((v) => [v.key.replace(/\s.*$/, ""), v.value]),
      );
      const expanded = entry.defaultParts.subject.replace(
        /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
        (_m, name) => sampleVars[name] ?? "",
      );
      expect(expanded).toBe(rendered.subject);
    });
  }
});