/**
 * AdminAvatar — avatar circular com iniciais.
 *
 * Usa as cores temáticas do admin v2 (`ACCENT_500`) para fundo, texto branco
 * centrado. Tamanhos suportados: 32 (tabela), 56 (legado) e 64 (ficha).
 */

import { ACCENT_500, type AdminAccent } from "./admin-tokens";

const DETERMINISTIC_COLORS = [
  "#1D9E75", // revenue
  "#534AB7", // leads
  "#BA7517", // expense
  "#D85A30", // signal
  "#185FA5", // info
  "#A32D2D", // danger
  "#3B6D11", // revenue-alt
  "#5F5E5A", // neutral
];

function colorFromSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  return DETERMINISTIC_COLORS[Math.abs(hash) % DETERMINISTIC_COLORS.length];
}

interface AdminAvatarProps {
  initials: string;
  variant?: AdminAccent;
  size?: 32 | 56 | 64;
  ariaLabel?: string;
  /** Quando presente, a cor de fundo é derivada por hash determinístico do seed e sobrepõe `variant`. */
  seed?: string;
}

export function AdminAvatar({
  initials,
  variant = "neutral",
  size = 32,
  ariaLabel,
  seed,
}: AdminAvatarProps) {
  const fontSize = size === 64 ? 22 : size === 56 ? 18 : 12;
  const bg = seed ? colorFromSeed(seed) : ACCENT_500[variant];
  return (
    <span
      role="img"
      aria-label={ariaLabel ?? initials}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{
        width: size,
        height: size,
        fontSize,
        backgroundColor: bg,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </span>
  );
}