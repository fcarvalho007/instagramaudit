import { queryOptions, useQuery } from "@tanstack/react-query";

import {
  PUBLIC_APP_CONFIG_DEFAULTS,
  type PublicAppConfig,
  getPublicAppConfig,
} from "./app-config.functions";

/**
 * Shared TanStack Query options for the public app config. Cached for 5
 * minutes — config rarely changes mid-session and stale reads are fine for
 * non-security UI (limits, contact email, feature flags).
 */
export const publicAppConfigQueryOptions = queryOptions({
  queryKey: ["app-config", "public"] as const,
  queryFn: () => getPublicAppConfig(),
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
});

/**
 * Hook returning the public app config, with safe defaults while the query
 * is still loading or if it errors out. Components never need to handle
 * loading states for this — defaults match the previous hardcoded values.
 */
export function usePublicAppConfig(): PublicAppConfig {
  const { data } = useQuery(publicAppConfigQueryOptions);
  return data ?? PUBLIC_APP_CONFIG_DEFAULTS;
}