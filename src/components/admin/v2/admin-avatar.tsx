/**
 * AdminAvatar — avatar circular com iniciais.
 *
 * Usa as cores temáticas do admin v2 (`ACCENT_500`) para fundo, texto branco
 * centrado. Tamanhos suportados: 32 (tabela), 56 (legado) e 64 (ficha).
 */

import { ACCENT_500, type AdminAccent } from "./admin-tokens";

interface AdminAvatarProps {
  initials: string;
  variant?: AdminAccent;
  size?: 32 | 56 | 64;
  ariaLabel?: string;
}

export function AdminAvatar({
  initials,
  variant = "neutral",
  size = 32,
  ariaLabel,
}: AdminAvatarProps) {
  const fontSize = size === 64 ? 22 : size === 56 ? 18 : 12;
  return (
    <span
      role="img"
      aria-label={ariaLabel ?? initials}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{
        width: size,
        height: size,
        fontSize,
        backgroundColor: ACCENT_500[variant],
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </span>
  );
}