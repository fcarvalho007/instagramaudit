import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withSupabaseHeaders } from "@/lib/auth-middleware-client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";

export const getAccountDetails = createServerFn({ method: "GET" })
  .middleware([withSupabaseHeaders, requireSupabaseAuth])
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

    let leadEmail: string | null = null;
    let marketingConsent: boolean | null = null;
    if (profile.lead_id) {
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("email, marketing_consent")
        .eq("id", profile.lead_id)
        .single();
      leadEmail = lead?.email ?? null;
      marketingConsent = lead?.marketing_consent ?? null;
    }

    return {
      email: profile.email,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      plan: profile.plan,
      createdAt: profile.created_at,
      leadEmail,
      leadId: profile.lead_id,
      marketingConsent,
    };
  });

export const updateDisplayName = createServerFn({ method: "POST" })
  .middleware([withSupabaseHeaders, requireSupabaseAuth])
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

export const updateMarketingConsent = createServerFn({ method: "POST" })
  .middleware([withSupabaseHeaders, requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const parsed = data as { consent: unknown };
    if (typeof parsed?.consent !== "boolean") {
      throw new Error("Consentimento inválido");
    }
    return { consent: parsed.consent };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("lead_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.lead_id) {
      throw new Error("Sem lead associado a esta conta.");
    }

    const leadId = profile.lead_id;

    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({
        marketing_consent: data.consent,
        marketing_consent_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (updateError) {
      throw new Error("Erro ao atualizar preferência de comunicações.");
    }

    await recordProductEvent({
      eventType: "marketing_consent_updated",
      leadId,
      metadata: { consent: data.consent, source: "account_page" },
    });

    if (data.consent === false) {
      try {
        await recordProductEvent({
          eventType: "lead_unsubscribed" as any,
          leadId,
          metadata: { source: "account_page" },
        });
      } catch (err) {
        console.error("[account] lead_unsubscribed event failed:", err);
      }
    }

    return { ok: true, marketingConsent: data.consent };
  });

export const ensureReportAssociation = createServerFn({ method: "POST" })
  .middleware([withSupabaseHeaders, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Get user email from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData.user?.email) {
      return { linked: false };
    }

    const { error } = await supabaseAdmin.rpc("link_user_to_existing_reports", {
      p_user_id: userId,
      p_email: userData.user.email,
    });

    if (error) {
      console.error("link_user_to_existing_reports error:", error.message);
      return { linked: false };
    }

    return { linked: true };
  });