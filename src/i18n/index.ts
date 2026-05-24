import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ptCommon from "./locales/pt/common.json";
import ptHeader from "./locales/pt/header.json";
import ptLanding from "./locales/pt/landing.json";
import enCommon from "./locales/en/common.json";
import enHeader from "./locales/en/header.json";
import enLanding from "./locales/en/landing.json";

export const SUPPORTED_LANGUAGES = ["pt", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANG_STORAGE_KEY = "instabench.lang";

function detectInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "pt";
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "pt" || stored === "en") return stored;
    const nav = window.navigator.language?.toLowerCase() ?? "";
    if (nav.startsWith("en")) return "en";
  } catch {
    // ignore (private mode, etc.)
  }
  return "pt";
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      pt: { common: ptCommon, header: ptHeader, landing: ptLanding },
      en: { common: enCommon, header: enHeader, landing: enLanding },
    },
    lng: detectInitialLanguage(),
    fallbackLng: "pt",
    defaultNS: "common",
    ns: ["common", "header", "landing"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;