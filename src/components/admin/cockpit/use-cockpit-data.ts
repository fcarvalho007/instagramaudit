/**
 * Shared loader hook for the admin cockpit.
 *
 * Single fetch to `/api/admin/diagnostics`; every tab consumes the same
 * snapshot. The shell exposes `refresh()` so a global "Atualizar" button
 * can re-run the request without each tab managing its own state.
 */

import { useCallback, useEffect, useState } from "react";

import type { CockpitData } from "./cockpit-types";

export interface UseCockpitDataResult {
  data: CockpitData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCockpitData(): UseCockpitDataResult {
  const [data, setData] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/diagnostics");
      if (!res.ok) {
        setError(`Erro ${res.status}`);
        setData(null);
        return;
      }
      const json = (await res.json()) as CockpitData;
      setData(json);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}