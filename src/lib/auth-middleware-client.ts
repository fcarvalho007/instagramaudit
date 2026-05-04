import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side middleware that injects the Supabase access token
 * as an Authorization header on server function requests.
 * Chain this BEFORE requireSupabaseAuth so the server side receives
 * the Bearer token it expects.
 */
export const withSupabaseHeaders = createMiddleware({
  type: "function",
}).client(async ({ next }) => {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token ?? null;
  }

  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});