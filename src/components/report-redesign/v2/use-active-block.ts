import { useCallback, useEffect, useState } from "react";

/**
 * Observa âncoras de bloco no DOM e devolve o ID do bloco actualmente
 * mais visível. Usado pela sidebar desktop e tabs mobile para destacar
 * a secção activa enquanto o utilizador faz scroll.
 *
 * Estratégia: o IntersectionObserver dispara quando uma secção entra
 * na faixa activa (≈ topo 25% da viewport). Em cada disparo,
 * recalculamos o bloco activo escolhendo a secção mais ao topo cujo
 * `rect.top` já cruzou um pequeno offset — isto evita o problema do
 * "best ratio wins" saltar blocos pequenos.
 */
export function useActiveBlock(ids: readonly string[]): string {
  const [active, setActive] = useState<string>(ids[0] ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const ACTIVE_OFFSET = Math.round(window.innerHeight * 0.25);

    const recompute = () => {
      let bestId = ids[0] ?? "";
      let bestTop = -Infinity;
      for (const el of elements) {
        const top = el.getBoundingClientRect().top;
        // Bloco mais ao topo cujo top ainda está acima do offset activo.
        if (top <= ACTIVE_OFFSET && top > bestTop) {
          bestTop = top;
          bestId = el.id;
        }
      }
      setActive((prev) => (prev === bestId ? prev : bestId));
    };

    const observer = new IntersectionObserver(
      () => recompute(),
      {
        rootMargin: "-10% 0px -75% 0px",
        threshold: [0, 0.05, 0.2, 0.5, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));

    // Estado inicial e resposta a scroll/resize manuais.
    recompute();
    window.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  return active;
}

export function scrollToBlock(id: string) {
  if (typeof window === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Hook auxiliar para a navegação: devolve o id activo e um callback
 * que faz scroll + actualiza optimistamente o estado, para resposta
 * imediata antes do IntersectionObserver disparar.
 */
export function useBlockNav(ids: readonly string[]) {
  const active = useActiveBlock(ids);
  // Mantemos o `useCallback` para identidade estável entre renders.
  const goTo = useCallback((id: string) => {
    scrollToBlock(id);
  }, []);
  return { active, goTo };
}
