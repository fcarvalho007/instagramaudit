import { useEffect } from "react";

import { scrollToBlock } from "./use-active-block";

interface Options {
  blockIds: readonly string[];
  onShowHelp: () => void;
}

/**
 * Global keyboard shortcuts for the /analyze page:
 *  - `g` then `1..9` → jump to block N
 *  - `t` → scroll to top
 *  - `?` (shift+/) → open shortcut help dialog
 *
 * Ignored when the user is typing in an input, textarea, contenteditable,
 * or has a modifier key (other than shift for `?`) pressed.
 */
export function useReportKeyboardShortcuts({ blockIds, onShowHelp }: Options) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let awaitingNumber = false;
    let awaitingTimer: number | null = null;

    const clearAwait = () => {
      awaitingNumber = false;
      if (awaitingTimer !== null) {
        window.clearTimeout(awaitingTimer);
        awaitingTimer = null;
      }
    };

    const isTypingTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      // `?` opens help
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        onShowHelp();
        clearAwait();
        return;
      }

      // `t` → top
      if (!awaitingNumber && e.key.toLowerCase() === "t") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // `g` opens block-jump sequence
      if (!awaitingNumber && e.key.toLowerCase() === "g") {
        e.preventDefault();
        awaitingNumber = true;
        awaitingTimer = window.setTimeout(clearAwait, 1500);
        return;
      }

      // After `g`, expect a digit 1..9
      if (awaitingNumber && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < blockIds.length) {
          scrollToBlock(blockIds[idx]);
        }
        clearAwait();
        return;
      }

      // Any other key while awaiting cancels.
      if (awaitingNumber) clearAwait();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearAwait();
    };
  }, [blockIds, onShowHelp]);
}