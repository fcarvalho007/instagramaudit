import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ptCommon from "./locales/pt/common.json";
import ptHeader from "./locales/pt/header.json";
import ptLanding from "./locales/pt/landing.json";
import ptFooter from "./locales/pt/footer.json";
import ptAuth from "./locales/pt/auth.json";
import ptAnalyze from "./locales/pt/analyze.json";
import ptGate from "./locales/pt/gate.json";
import ptErrors from "./locales/pt/errors.json";
import ptReport from "./locales/pt/report.json";
import ptUnsubscribe from "./locales/pt/unsubscribe.json";
import ptPricing from "./locales/pt/pricing.json";
import ptConversion from "./locales/pt/conversion.json";
import enCommon from "./locales/en/common.json";
import enHeader from "./locales/en/header.json";
import enLanding from "./locales/en/landing.json";
import enFooter from "./locales/en/footer.json";
import enAuth from "./locales/en/auth.json";
import enAnalyze from "./locales/en/analyze.json";
import enGate from "./locales/en/gate.json";
import enErrors from "./locales/en/errors.json";
import enReport from "./locales/en/report.json";
import enUnsubscribe from "./locales/en/unsubscribe.json";
import enPricing from "./locales/en/pricing.json";
import enConversion from "./locales/en/conversion.json";

export const SUPPORTED_LANGUAGES = ["pt", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANG_STORAGE_KEY = "instabench.lang";

// IMPORTANT: SSR and the initial client render MUST use the same language to
// avoid hydration mismatches. We always init with "pt" and let the
// useLanguage hook switch to the user's stored preference AFTER hydration.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      pt: {
        common: ptCommon,
        header: ptHeader,
        landing: ptLanding,
        footer: ptFooter,
        auth: ptAuth,
        analyze: ptAnalyze,
        gate: ptGate,
        errors: ptErrors,
        report: ptReport,
        unsubscribe: ptUnsubscribe,
        pricing: ptPricing,
        conversion: ptConversion,
      },
      en: {
        common: enCommon,
        header: enHeader,
        landing: enLanding,
        footer: enFooter,
        auth: enAuth,
        analyze: enAnalyze,
        gate: enGate,
        errors: enErrors,
        report: enReport,
        unsubscribe: enUnsubscribe,
        pricing: enPricing,
        conversion: enConversion,
      },
    },
    lng: "pt",
    fallbackLng: "pt",
    defaultNS: "common",
    ns: [
      "common",
      "header",
      "landing",
      "footer",
      "auth",
      "analyze",
      "gate",
      "errors",
      "report",
      "unsubscribe",
      "pricing",
      "conversion",
    ],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    // Force synchronous init so SSR can read resources on the first render
    // (default is async; otherwise t() returns the key during SSR and the
    // client hydrates with the translated value, causing a mismatch).
    initImmediate: false,
  } as Parameters<typeof i18n.init>[0]);
}

export default i18n;