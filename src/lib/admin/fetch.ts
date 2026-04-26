/**
 * Helper para chamadas client-side a /api/admin/*.
 *
 * Lê o JWT da sessão Supabase atual e injeta-o no header
 * `Authorization: Bearer <token>` antes de cada pedido. Os handlers
 * server-side validam o JWT + a allowlist em `requireAdminSession()`.
 */

import { supabase } from "@/integrations/supabase/client";

export async function adminFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}