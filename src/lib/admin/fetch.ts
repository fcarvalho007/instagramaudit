/**
 * Helper para chamadas client-side a /api/admin/*.
 *
 * Lê o JWT da sessão Supabase atual e injeta-o no header
 * `Authorization: Bearer <token>` antes de cada pedido. Os handlers
 * server-side validam o JWT + a allowlist em `requireAdminSession()`.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Quando um pedido admin devolve 401, a sessão Supabase está expirada ou
 * inválida. Disparamos signOut() para que o gate em /admin volte ao estado
 * "signed_out" e mostre o botão "Entrar com Google" em vez de "Erro 401".
 */
let signingOut = false;
async function handleUnauthorized(): Promise<void> {
  if (signingOut) return;
  signingOut = true;
  try {
    await supabase.auth.signOut();
  } catch {
    // ignorar — o listener onAuthStateChange tratará do reset de UI
  } finally {
    signingOut = false;
  }
}

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

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    void handleUnauthorized();
  }
  return res;
}