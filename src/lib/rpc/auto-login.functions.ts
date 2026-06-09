/**
 * Auto-login server function — testing phase only.
 *
 * Sets a temporary password on the hardcoded test user, returns it to the
 * client so it can do a standard signInWithPassword. Zero friction.
 *
 * Disabled by default in production. Set `BETA_AUTOLOGIN=1` to opt in.
 * Returning a server-generated password to the browser is acceptable only
 * inside the private beta — never as a user-facing pattern.
 */
import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "crypto";

const ALLOWED_EMAIL = "fredericodigital@gmail.com";

export const autoLogin = createServerFn({ method: "POST" })
  .handler(async () => {
    if (process.env.BETA_AUTOLOGIN !== "1") {
      throw new Error(
        "autoLogin disabled — set BETA_AUTOLOGIN=1 to enable the beta-only shortcut.",
      );
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // 1. Find or create the user
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    let user = listData?.users?.find(
      (u) => u.email?.toLowerCase() === ALLOWED_EMAIL,
    );

    const tempPassword = randomBytes(24).toString("hex");

    if (!user) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: ALLOWED_EMAIL,
          password: tempPassword,
          email_confirm: true,
        });
      if (createErr) throw new Error(createErr.message);
      user = created.user;
    } else {
      // Update existing user's password to the temp one
      const { error: updateErr } =
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: tempPassword,
        });
      if (updateErr) throw new Error(updateErr.message);
    }

    return { email: ALLOWED_EMAIL, password: tempPassword };
  });
