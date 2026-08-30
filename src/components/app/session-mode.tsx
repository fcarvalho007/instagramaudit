import { createContext, useContext } from "react";

/**
 * Modo de sessão da área privada:
 *   - `auth`: utilizador Supabase (caminho histórico, com password);
 *   - `lead`: email verificado via magic link, sem password (Ronda 5B).
 * O modo `auth` tem precedência quando ambos existem.
 *
 * O contexto vive fora de `src/routes/app.tsx` de propósito: os ficheiros de
 * rota são divididos em chunks (`?tsr-split=component`), o que criaria duas
 * instâncias do módulo — provider e consumidor deixariam de partilhar o
 * mesmo contexto e a área privada cairia sempre no modo `auth`.
 */
export type AppSessionMode = "auth" | "lead";

export const SessionModeContext = createContext<AppSessionMode>("auth");

export function useAppSessionMode(): AppSessionMode {
  return useContext(SessionModeContext);
}
