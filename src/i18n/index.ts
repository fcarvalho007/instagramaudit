import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ptCommon from "./locales/pt/common.json";
import ptHeader from "./locales/pt/header.json";
import ptLanding from "./locales/pt/landing.json";
import ptFooter from "./locales/pt/footer.json";
import ptAuth from "./locales/pt/auth.json";
import enCommon from "./locales/en/common.json";
import enHeader from "./locales/en/header.json";
import enLanding from "./locales/en/landing.json";
import enFooter from "./locales/en/footer.json";
import enAuth from "./locales/en/auth.json";

export const SUPPORTED_LANGUAGES = ["pt", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANG_STORAGE_KEY = "instabench.lang";

// IMPORTANT: SSR and the initial client render MUST use the same language to
// avoid hydration mismatches. We always init with "pt" and let the
// useLanguage hook switch to the user's stored preference AFTER hydration.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      pt: { common: ptCommon, header: ptHeader, landing: ptLanding, footer: ptFooter, auth: ptAuth },
      en: { common: enCommon, header: enHeader, landing: enLanding, footer: enFooter, auth: enAuth },
    },
    lng: "pt",
    fallbackLng: "pt",
    defaultNS: "common",
    ns: ["common", "header", "landing", "footer", "auth"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;