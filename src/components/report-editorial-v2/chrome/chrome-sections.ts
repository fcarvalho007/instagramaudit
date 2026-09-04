import {
  COMMERCIAL_SECTIONS,
  type CommercialSection,
} from "@/components/report-redesign/v2/block-config";
import {
  resolveSectionAccess,
  type SectionAccess,
} from "@/components/report-redesign/v2/access-gating";

import { EDITORIAL_V2_DISPLAY_NUMBERS } from "../section-metadata";

/**
 * Registo de secções da chrome Editorial V2.
 *
 * As chaves funcionais (tier, gating) continuam a vir de
 * `COMMERCIAL_SECTIONS` + `resolveSectionAccess` — esta camada só
 * traduz para as âncoras e números de apresentação do Editorial V2.
 * Nenhuma regra de acesso é criada aqui.
 */

/** Âncora de produção → âncora Editorial V2. */
const ANCHOR_MAP: Readonly<Record<string, string>> = {
  overview: "visao-geral",
};

/** Ordem editorial 00 → 07 desta variante. */
const EDITORIAL_ORDER: readonly string[] = [
  "visao-geral",
  "engagement",
  "frequencia",
  "formatos",
  "publicacoes-chave",
  "conversas",
  "diagnostico-editorial",
  "prioridades",
];

export interface ChromeSection extends SectionAccess {
  /** Âncora real renderizada pelas secções Editorial V2. */
  id: string;
  /** Rótulo visual "00"–"07". Nunca uma chave funcional. */
  displayNumber: string;
  label: string;
  tier: CommercialSection["tier"];
}

export function buildChromeSections({
  premiumUnlocked,
  leadCaptured,
}: {
  premiumUnlocked: boolean;
  leadCaptured: boolean;
}): ChromeSection[] {
  const byAnchor = new Map<string, CommercialSection>();
  for (const section of COMMERCIAL_SECTIONS) {
    byAnchor.set(ANCHOR_MAP[section.id] ?? section.id, section);
  }

  return EDITORIAL_ORDER.flatMap((anchor) => {
    const source = byAnchor.get(anchor);
    const displayNumber = EDITORIAL_V2_DISPLAY_NUMBERS[anchor];
    if (!source || !displayNumber) return [];
    return [
      {
        id: anchor,
        displayNumber,
        label: source.shortLabel,
        tier: source.tier,
        ...resolveSectionAccess(source.tier, premiumUnlocked, leadCaptured),
      },
    ];
  });
}
