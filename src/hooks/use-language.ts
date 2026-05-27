import * as React from "react";
import { useTranslation } from "react-i18next";

import {
  LANG_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/i18n";

export function useLanguage() {
  const { i18n } = useTranslation();
  const current = (
    SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
      ? i18n.language
      : "pt"
  ) as SupportedLanguage;

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = current === "pt" ? "pt-PT" : "en";
    }
  }, [current]);

  // Sync language from localStorage / navigator AFTER hydration, so SSR and
  // first client render always use "pt" (the i18n init default).
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
      let next: SupportedLanguage | null = null;
      if (stored === "pt" || stored === "en") {
        next = stored;
      } else {
        const nav = window.navigator.language?.toLowerCase() ?? "";
        if (nav.startsWith("pt")) {
          next = "pt";
        } else if (nav.startsWith("en")) {
          next = "en";
        } else {
          // Weak fallback: timezone. No IP geolocation, no external calls.
          try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz === "Europe/Lisbon") next = "pt";
          } catch {
            // ignore
          }
        }
      }
      if (next && next !== i18n.language) {
        void i18n.changeLanguage(next);
      }
    } catch {
      // ignore (private mode, etc.)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = React.useCallback(
    (lang: SupportedLanguage) => {
      void i18n.changeLanguage(lang);
      try {
        window.localStorage.setItem(LANG_STORAGE_KEY, lang);
      } catch {
        // ignore
      }
    },
    [i18n],
  );

  return { language: current, setLanguage };
}