/**
 * Copy editorial para o posicionamento beta e bloco de feedback no relatório
 * público (`/analyze/$username`). Não afeta `/report/example`.
 *
 * Língua: Português europeu (Acordo Ortográfico pós-1990).
 */

export const BETA_COPY = {
  feedback: {
    eyebrow: "Feedback beta",
    title: "Este relatório foi útil?",
    subtitle:
      "O InstaBench está em fase beta. Um email curto ajuda-nos a tornar a análise mais útil para marcas, criadores e equipas de marketing.",
    action: {
      label: "Enviar feedback por email",
      href: "mailto:hello@instagramaudit.lovable.app?subject=Feedback%20InstaBench",
    },
    note: "Sem compromisso. O objetivo é melhorar o produto com utilizadores reais.",
  },
} as const;