import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { COMMERCIAL_SECTIONS } from "@/components/report-redesign/v2/block-config";

/**
 * Regressão de acesso: as secções de escalão `free_email` só podem ser
 * renderizadas depois da captura de email (ou com Pro), tal como em produção.
 * O anónimo não pode ver o mix de formatos nem as conversas.
 */
const shellSource = readFileSync(
  join(process.cwd(), "src/components/report-editorial-v2/editorial-v2-shell.tsx"),
  "utf8",
);

describe("Editorial V2 — fronteiras de acesso das secções", () => {
  it("mantém `formatos` e `conversas` como free_email em produção", () => {
    const tierOf = (id: string) =>
      COMMERCIAL_SECTIONS.find((s) => s.id === id)?.tier;
    expect(tierOf("formatos")).toBe("free_email");
    expect(tierOf("conversas")).toBe("free_email");
  });

  it("não renderiza o mix de formatos a visitantes anónimos", () => {
    const block = shellSource.slice(
      shellSource.indexOf("EditorialFormatMix") - 400,
      shellSource.indexOf("EditorialFormatMix") + 120,
    );
    expect(block).toContain("leadCaptured || premiumUnlocked");
  });

  it("não renderiza as conversas a visitantes anónimos", () => {
    const block = shellSource.slice(
      shellSource.indexOf("EditorialConversations") - 400,
      shellSource.indexOf("EditorialConversations") + 120,
    );
    expect(block).toContain("leadCaptured || premiumUnlocked");
  });
});
