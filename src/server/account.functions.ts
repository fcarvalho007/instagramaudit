import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAccountDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url, plan, created_at, lead_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Perfil não encontrado");
    }

    // If profile has a linked lead, fetch lead email
    let leadEmail: string | null = null;
    if (profile.lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("email")
        .eq("id", profile.lead_id)
        .single();
      leadEmail = lead?.email ?? null;
    }

    return {
      email: profile.email,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      plan: profile.plan,
      createdAt: profile.created_at,
      leadEmail,
    };
  });

export const updateDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const parsed = data as { displayName: string };
    if (typeof parsed.displayName !== "string" || parsed.displayName.length > 100) {
      throw new Error("Nome inválido");
    }
    return parsed;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const trimmed = data.displayName.trim();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed || null })
      .eq("id", userId);

    if (error) {
      throw new Error("Erro ao guardar o nome");
    }

    return { ok: true, displayName: trimmed || null };
  });