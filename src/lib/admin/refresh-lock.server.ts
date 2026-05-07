/**
 * Shared in-memory lock for concurrent refresh protection.
 * Imported by both refresh-profile and refresh-profile-preflight routes.
 */
export const refreshingHandles = new Set<string>();