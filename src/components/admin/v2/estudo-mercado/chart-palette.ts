/**
 * Paleta centralizada para os gráficos do /admin/estudo-mercado.
 * Alinhada com a paleta admin (primary #3772E5 / secondary #7664E4 / amber #BA7517).
 * Nunca introduzir hex hardcoded nos componentes — importar daqui.
 */

export const chartPalette = {
  positive: "#1D9E75",
  neutral: "#888780",
  warning: "#BA7517",
  negative: "#E24B4A",
  accentPrimary: "#3772E5",
  accentSecondary: "#7664E4",
  accentAmber: "#BA7517",
} as const;

export const ratingColor: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: chartPalette.negative,
  2: chartPalette.warning,
  3: chartPalette.neutral,
  4: chartPalette.accentPrimary,
  5: chartPalette.positive,
};

export const sourceColor = {
  inline: chartPalette.accentPrimary,
  beta: chartPalette.accentSecondary,
  pricing: chartPalette.accentAmber,
} as const;

export const intentColor = {
  yes: chartPalette.positive,
  maybe: chartPalette.accentPrimary,
  no: chartPalette.negative,
  unsure: chartPalette.neutral,
} as const;