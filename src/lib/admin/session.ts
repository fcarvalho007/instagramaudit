/**
 * Admin session helpers.
 *
 * Temporary internal access pattern: validates against `INTERNAL_API_TOKEN`
 * (already in use by the report pipeline) and stores an encrypted, httpOnly
 * cookie via TanStack Start's `useSession`. No new dependency, no hardcoded
 * credentials.
 *
 * The session password is derived from the same token (suffixed) so that
 * rotating the token invalidates all admin sessions automatically.
 */

import { useSession } from "@tanstack/react-start/server";

const SESSION_NAME = "ib_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

interface AdminSessionData {
  authenticatedAt?: string;
}

function getSessionConfig() {
  const token = process.env.INTERNAL_API_TOKEN;
  if (!token) {
    throw new Error(
      "INTERNAL_API_TOKEN is not configured — admin session unavailable.",
    );
  }
  // useSession requires >=32 chars; pad deterministically if needed.
  const password = `${token}::admin-session-v1`.padEnd(32, "0");
  return {
    password,
    name: SESSION_NAME,
    maxAge: SESSION_MAX_AGE_SECONDS,
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  };
}

export async function getAdminSession() {
  return useSession<AdminSessionData>(getSessionConfig());
}

export async function setAdminSession(): Promise<void> {
  const session = await getAdminSession();
  await session.update({ authenticatedAt: new Date().toISOString() });
}

export async function clearAdminSession(): Promise<void> {
  const session = await getAdminSession();
  await session.clear();
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const session = await getAdminSession();
    return Boolean(session.data?.authenticatedAt);
  } catch (err) {
    console.error("[admin/session] check failed:", err);
    return false;
  }
}

/**
 * Throws a Response (401) when the caller is not an authenticated admin.
 * Use at the top of any /api/admin/* handler.
 */
export async function requireAdminSession(): Promise<void> {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    throw new Response(
      JSON.stringify({ success: false, error_code: "UNAUTHORIZED", message: "Sessão expirada ou inválida." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
}
