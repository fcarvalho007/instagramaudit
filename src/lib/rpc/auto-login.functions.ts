/**
 * Auto-login server function — admin-only beta shortcut.
 *
 * SECURITY: this function generates a temporary password on the server
 * and returns it to the browser so the caller can perform a regular
 * `signInWithPassword`. Returning a server-generated password is NEVER an
 * acceptable public UX — it exists only to give the operator a 1-click
 * login during private beta debugging.
 *
 * Gates (ALL required):
 *   1. `BETA_AUTOLOGIN=1` env var must be set on the server.
 *   2. The caller's email (read from the existing Supabase session) must
 *      be in `ADMIN_ALLOWED_EMAILS`. If no session exists, the function
 *      throws — there is no public path that succeeds.
 *
 * The public `/login` page is a normal email+password form; it never
 * calls this function.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { randomBytes } from "crypto";

const ALLOWED_EMAIL = "fredericodigital@gmail.com";

/**
 * Pure gate — exported so a unit test can assert that the env flag +
 * admin allowlist are both required. Returns `true` only when BOTH:
 *   - process.env.BETA_AUTOLOGIN === "1"
 *   - callerEmail is in ADMIN_ALLOWED_EMAILS (case-insensitive)
 */
export function isAutoLoginAllowed(
  callerEmail: string | null | undefined,
  env: { BETA_AUTOLOGIN?: string; ADMIN_ALLOWED_EMAILS?: string },
): boolean {
  if (env.BETA_AUTOLOGIN !== "1") return false;
  if (!callerEmail) return false;
  const allowed = (env.ADMIN_ALLOWED_EMAILS ?? "")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);
  return allowed.includes(callerEmail.toLowerCase());
}

export const autoLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const callerEmail = (context.claims?.email as string | undefined) ?? null;
    if (!isAutoLoginAllowed(callerEmail, process.env)) {
      throw new Response("Not found", { status: 404 });
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
