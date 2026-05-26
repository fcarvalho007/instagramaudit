/**
 * Identidade legal central da entidade operadora do AuditProfiles.
 *
 * Source of truth para razão social, sede, email de privacidade/DPO e
 * domínio. Páginas legais (privacidade, termos, aviso-legal, cookies)
 * importam daqui em vez de hardcoded.
 *
 * Nota: o unlock modal mostra `operator.name`/`operator.city` via i18n
 * (`src/i18n/locales/{pt,en}/gate.json`). i18n permanece a fonte canónica
 * para visible text, mas duplica `companyName` e `operatorCity` daqui —
 * `legal.test.ts` valida que não há drift.
 */
export const LEGAL = {
  companyName: "Fomentar Sonhos, Lda.",
  responsibleName: "Frederico Carvalho",
  address: {
    street: "Rua da Carvalha n.º 570",
    postalCode: "2400-441",
    city: "Leiria",
    country: "Portugal",
    full: "Rua da Carvalha n.º 570 · 2400-441 Leiria · Portugal",
  },
  privacyEmail: "frederico.carvalho@digitalfc.pt",
  domain: "auditprofiles.com",
  operatorCity: "Leiria, Portugal",
  productName: "AuditProfiles",
} as const;

export type LegalIdentity = typeof LEGAL;