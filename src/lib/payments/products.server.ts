/**
 * Server-only authoritative product catalogue. The amount in cents lives
 * here so the frontend can never decide price.
 */

import type { ProductCode } from "./products";

export interface ServerProduct {
  code: ProductCode;
  namePt: string;
  amountCents: number;
  currency: "EUR";
  /** Reflected in EuPago description / Pay By Link title. */
  description: string;
}

export const SERVER_PRODUCTS: Record<ProductCode, ServerProduct> = {
  authority_diagnosis_97: {
    code: "authority_diagnosis_97",
    namePt: "Diagnóstico de Autoridade Digital",
    amountCents: 9700,
    currency: "EUR",
    description:
      "Diagnóstico de Autoridade Digital — relatório completo + sessão humana de 30 min + 3 prioridades.",
  },
  report_full_9: {
    code: "report_full_9",
    namePt: "Relatório completo",
    amountCents: 900,
    currency: "EUR",
    description: "Desbloqueio do relatório completo.",
  },
  credit_pack_1: {
    code: "credit_pack_1",
    namePt: "1 crédito de análise",
    amountCents: 900,
    currency: "EUR",
    description: "1 crédito adicional para gerar novas análises (período ou concorrente) no relatório Pro.",
  },
  credits_3: {
    code: "credits_3",
    namePt: "3 créditos de análise",
    amountCents: 900,
    currency: "EUR",
    description: "Pack de 3 créditos para gerar novas análises no relatório Pro.",
  },
  credits_10: {
    code: "credits_10",
    namePt: "10 créditos de análise",
    amountCents: 2500,
    currency: "EUR",
    description: "Pack de 10 créditos para gerar novas análises no relatório Pro.",
  },
  credits_25: {
    code: "credits_25",
    namePt: "25 créditos de análise",
    amountCents: 4900,
    currency: "EUR",
    description: "Pack de 25 créditos para gerar novas análises no relatório Pro.",
  },
};

export function getServerProduct(code: ProductCode): ServerProduct {
  const p = SERVER_PRODUCTS[code];
  if (!p) {
    throw new Error(`Unknown product code: ${code}`);
  }
  return p;
}