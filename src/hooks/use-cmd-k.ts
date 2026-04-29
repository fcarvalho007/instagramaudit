/**
 * useCmdK — atalho global Cmd+K (macOS) / Ctrl+K (Windows/Linux).
 *
 * Quando o utilizador prime a combinação, o callback fornecido é
 * invocado e o evento é prevenido (evita o atalho de pesquisa do
 * navegador). Não actua dentro de inputs já em foco — assim o Cmd+K
 * dentro de outro input passa para o navegador como esperado.
 */

import { useEffect } from "react";

export function useCmdK(onTrigger: () => void): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K");
      if (!isCmdK) return;
      e.preventDefault();
      onTrigger();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onTrigger]);
}