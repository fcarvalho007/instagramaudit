import { useEffect, useRef, useState } from "react";

/**
 * Movimento contido do Editorial V2.
 *
 * - Revelação: dispara quando o elemento entra em viewport.
 * - Count-up / preenchimento: interpolado apenas depois da revelação.
 *
 * Nenhum global do browser é tocado durante SSR/hidratação: tudo vive
 * dentro de `useEffect`. Com `prefers-reduced-motion: reduce` salta
 * directamente para o estado final.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}

/** Interpola de 0 até `target` quando `active` fica verdadeiro. */
export function useCountUp(target: number, active: boolean, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof requestAnimationFrame === "undefined") {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);

  return value;
}
