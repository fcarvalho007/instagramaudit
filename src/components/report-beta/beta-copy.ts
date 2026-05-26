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
      "O AuditProfiles está em fase beta. Um email curto ajuda-nos a tornar a análise mais útil para marcas, criadores e equipas de marketing.",
    action: {
      label: "Enviar feedback por email",
      href: "mailto:hello@auditprofiles.com?subject=Feedback%20AuditProfiles",
    },
    note: "Sem compromisso. O objetivo é melhorar o produto com utilizadores reais.",
  },
} as const;