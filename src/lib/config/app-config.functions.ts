/**
 * Public app configuration exposed to the browser.
 *
 * Reads a curated subset of `app_config` rows that the frontend may safely
 * consume (limits, public contact info, feature flags). Anything sensitive
 * (cost caps, allowlists) stays behind admin-only server functions.
 */

import { createServerFn } from "@tanstack/react-start";

import {
  parseConfigBool,
  parseConfigInt,
  readAppConfig,
} from "./app-config.server";

export interface PublicAppConfig {
  /** Monthly limit of free report requests per lead. */
  freeMonthlyReportLimit: number;
  /** Public contact email used in footer / CTAs / gate modal. */
  contactEmail: string;
  /** When true, the "Comparar concorrente" feature is live (no teaser badge). */
  compareEnabled: boolean;
}

export const PUBLIC_APP_CONFIG_DEFAULTS: PublicAppConfig = {
  freeMonthlyReportLimit: 3,
  contactEmail: "hello@instabench.pt",
  compareEnabled: false,
};

export const getPublicAppConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicAppConfig> => {
    const map = await readAppConfig([
      "free_monthly_report_limit",
      "contact_email",
      "feature_compare_competitors_enabled",
    ]);

    return {
      freeMonthlyReportLimit: parseConfigInt(
        map.free_monthly_report_limit,
        PUBLIC_APP_CONFIG_DEFAULTS.freeMonthlyReportLimit,
      ),
      contactEmail:
        (map.contact_email && map.contact_email.trim()) ||
        PUBLIC_APP_CONFIG_DEFAULTS.contactEmail,
      compareEnabled: parseConfigBool(
        map.feature_compare_competitors_enabled,
        PUBLIC_APP_CONFIG_DEFAULTS.compareEnabled,
      ),
    };
  },
);