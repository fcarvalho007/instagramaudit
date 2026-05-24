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