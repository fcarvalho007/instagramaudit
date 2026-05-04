/**
 * Auto-login server function — testing phase only.
 * Generates a session for a hardcoded email without any user interaction
 * beyond clicking a button. Uses admin API to create/find the user and
 * generate a magic link token that the client verifies immediately.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ALLOWED_EMAIL = "fredericodigital@gmail.com";

export const autoLogin = createServerFn({ method: "POST" })
  .handler(async () => {
    // Ensure user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let user = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === ALLOWED_EMAIL,
    );

    if (!user) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: ALLOWED_EMAIL,
          email_confirm: true,
        });
      if (createErr) throw new Error(createErr.message);
      user = created.user;
    }

    // Generate a magic link (server-side, no email sent)
    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: ALLOWED_EMAIL,
      });

    if (linkErr || !linkData?.properties) {
      throw new Error(linkErr?.message ?? "Não foi possível gerar sessão.");
    }

    return {
      email: ALLOWED_EMAIL,
      token_hash: linkData.properties.hashed_token,
    };
  });
