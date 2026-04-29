/**
 * AdminAuthShell — gate de auth (Google + allowlist) reutilizado pelo layout
 * `admin.tsx` v2. Lógica idêntica à do `admin.tsx` original — apenas
 * encapsulada para o layout chamar `<AdminAuthShell><Outlet/></AdminAuthShell>`.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { AdminGate } from "@/components/admin/admin-gate";
import { supabase } from "@/integrations/supabase/client";

type AuthState = "checking" | "signed_out" | "denied" | "in";

const UNSET: unique symbol = Symbol("unset");
type EvaluatedToken = string | null | typeof UNSET;

const CACHE_KEY = "admin.whoami.v1";
// 5 minutos: a sessão é revalidada na próxima alteração do auth state ou
// num refresh/expiry; cache mais longo elimina o "A verificar sessão…" em
// navegações entre tabs do admin.
const CACHE_TTL_MS = 5 * 60_000;
const SPINNER_DELAY_MS = 80;

type CachedWhoami = {
  token: string;
  allowed: boolean;
  email: string | null;
  ts: number;
};

// localStorage sobrevive a refreshs e a abrir nova tab; sessionStorage não.
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readCache(): CachedWhoami | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWhoami;
    if (!parsed || typeof parsed.token !== "string") return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(entry: CachedWhoami) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* ignore quota errors */
  }
}

function clearCache() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

interface AdminAuthShellProps {
  children: ReactNode;
  /** Callback opcional para o layout receber o handler de logout. */
  onLogoutReady?: (handler: () => Promise<void>) => void;
}

export function AdminAuthShell({ children, onLogoutReady }: AdminAuthShellProps) {
  // SSR-safe: sempre "checking" no primeiro render (server + client) para
  // evitar hydration mismatch. Logo após mount, lemos o cache e saltamos
  // para "in"/"denied" se possível, evitando o flash do spinner.
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const lastEvaluatedTokenRef = useRef<EvaluatedToken>(UNSET);
  // Mantemos a referência mais recente de `onLogoutReady` num ref para
  // evitar que o useEffect que liga o handler dispare a cada render — o pai
  // costuma passar uma função nova em cada render e isso provocava
  // "Maximum update depth exceeded" (loop infinito setState ↔ render).
  const onLogoutReadyRef = useRef(onLogoutReady);
  useEffect(() => {
    onLogoutReadyRef.current = onLogoutReady;
  }, [onLogoutReady]);

  // Hidrata estado optimista a partir do cache local após mount.
  useEffect(() => {
    const cached = readCache();
    if (!cached) return;
    if (cached.allowed) {
      setAuthState("in");
      setDeniedEmail(null);
    } else {
      setAuthState("denied");
      setDeniedEmail(cached.email);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function evaluate(token: string | null) {
      if (lastEvaluatedTokenRef.current === token) return;
      lastEvaluatedTokenRef.current = token;
      if (!token) {
        if (!cancelled) {
          setAuthState("signed_out");
          setDeniedEmail(null);
          clearCache();
        }
        return;
      }

      // Optimistic: usar cache se mesmo token e ainda fresco.
      const cached = readCache();
      if (cached && cached.token === token) {
        if (cached.allowed) {
          if (!cancelled) {
            setAuthState("in");
            setDeniedEmail(null);
          }
          return;
        }
        if (!cancelled) {
          setDeniedEmail(cached.email);
          setAuthState("denied");
        }
        return;
      }

      try {
        const res = await fetch("/api/admin/whoami", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await res.json().catch(() => ({}))) as {
          allowed?: boolean;
          email?: string | null;
        };
        if (cancelled) return;
        writeCache({
          token,
          allowed: !!body.allowed,
          email: body.email ?? null,
          ts: Date.now(),
        });
        if (body.allowed) {
          setAuthState("in");
          setDeniedEmail(null);
        } else {
          setDeniedEmail(body.email ?? null);
          setAuthState("denied");
          await supabase.auth.signOut().catch(() => null);
        }
      } catch {
        if (!cancelled) setAuthState("signed_out");
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void evaluate(session?.access_token ?? null);
    });

    // Em paralelo: `getSession()` resolve quase instantaneamente quando a
    // sessão está em localStorage. `onAuthStateChange` pode demorar ~300ms a
    // disparar `INITIAL_SESSION`; `evaluate()` deduplica via
    // `lastEvaluatedTokenRef`, por isso não há chamada dupla a /api/admin/whoami.
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        void evaluate(data.session?.access_token ?? null);
      })
      .catch(() => {
        /* listener trata o fallback */
      });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Mostra "A verificar sessão…" só após pequeno delay, para evitar flash
  // quando o whoami é rápido ou o cache resolve imediatamente.
  useEffect(() => {
    if (authState !== "checking") {
      setShowSpinner(false);
      return;
    }
    const t = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => clearTimeout(t);
  }, [authState]);

  useEffect(() => {
    const handler = async () => {
      await supabase.auth.signOut().catch(() => null);
      lastEvaluatedTokenRef.current = UNSET;
      clearCache();
      setAuthState("signed_out");
      setDeniedEmail(null);
    };
    onLogoutReadyRef.current?.(handler);
    // Intencionalmente sem dependências — corre uma vez no mount. A ref
    // `onLogoutReadyRef` resolve sempre o callback mais recente do pai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authState === "checking") {
    if (!showSpinner) {
      return <div className="min-h-screen bg-surface-base" />;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base text-content-secondary">
        A verificar sessão…
      </div>
    );
  }

  if (authState === "signed_out") {
    return (
      <>
        <AdminGate />
        <Toaster />
      </>
    );
  }

  if (authState === "denied") {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-surface-base px-4">
          <div className="w-full max-w-sm space-y-6 rounded-xl border border-border-subtle bg-surface-elevated p-8 shadow-xl">
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-content-tertiary">
                InstaBench · Admin
              </p>
              <h1 className="font-display text-2xl text-content-primary">Acesso restrito</h1>
              <p className="text-sm text-content-secondary">
                {deniedEmail
                  ? `A conta ${deniedEmail} não está autorizada a aceder ao backoffice.`
                  : "Esta conta Google não está autorizada a aceder ao backoffice."}
              </p>
              <p className="text-xs text-content-tertiary">
                A sessão foi terminada. Tenta novamente com uma conta autorizada.
              </p>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                lastEvaluatedTokenRef.current = UNSET;
                setAuthState("signed_out");
              }}
            >
              Entrar com outra conta
            </Button>
          </div>
        </div>
        <Toaster />
      </>
    );
  }

  return <>{children}</>;
}