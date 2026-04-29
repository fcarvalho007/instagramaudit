/**
 * useDebouncedValue — devolve uma versão "amortecida" do valor que só
 * actualiza após `delayMs` sem mudanças.
 *
 * Útil para pesquisa: evita refiltrar a tabela a cada tecla.
 */

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}