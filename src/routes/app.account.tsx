import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAccountDetails, updateDisplayName, updateMarketingConsent } from "@/server/account.functions";
import { User, Calendar, Mail, Shield, LogOut, Pencil, Check, X, Loader2, BellRing } from "lucide-react";

export const Route = createFileRoute("/app/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Conta — AuditProfiles" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

interface AccountData {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  plan: string;
  createdAt: string;
  leadEmail: string | null;
  leadId: string | null;
  marketingConsent: boolean | null;
}

function AccountPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAccountDetails();
      setAccount(data);
      setNameInput(data.displayName ?? "");
    } catch {
      setError("Não foi possível carregar os dados da conta.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);

  const handleSaveName = async () => {
    setSaving(true);
    try {
      const result = await updateDisplayName({ data: { displayName: nameInput } });
      setAccount((prev) => prev ? { ...prev, displayName: result.displayName } : prev);
      setEditing(false);
    } catch {
      // stay in edit mode
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const handleToggleConsent = async () => {
    if (!account || consentSaving) return;
    const next = !(account.marketingConsent ?? false);
    setConsentSaving(true);
    setConsentError(null);
    setAccount((prev) => (prev ? { ...prev, marketingConsent: next } : prev));
    try {
      const result = await updateMarketingConsent({ data: { consent: next } });
      setAccount((prev) => (prev ? { ...prev, marketingConsent: result.marketingConsent } : prev));
    } catch {
      setAccount((prev) => (prev ? { ...prev, marketingConsent: !next } : prev));
      setConsentError("Não foi possível atualizar a preferência. Tenta novamente.");
    } finally {
      setConsentSaving(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-content-tertiary" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">{error ?? "Erro desconhecido"}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-content-primary">
        Conta
      </h1>
      <p className="mt-1 text-sm text-content-tertiary">
        Informações e definições da conta.
      </p>

      {/* Profile card */}
      <div className="mt-6 rounded-xl border border-border-default/20 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <User className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-content-primary">
              {account.displayName ?? account.email}
            </p>
            <p className="text-xs text-content-tertiary">{account.email}</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Display Name — editable */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              Nome de apresentação
            </label>
            {editing ? (
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={100}
                  className="h-8 flex-1 rounded-md border border-border-default/20 bg-surface-muted px-3 text-sm text-content-primary outline-none focus:border-accent-primary/40 focus:ring-1 focus:ring-accent-primary/20"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="flex size-8 items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none"
                  aria-label="Guardar nome"
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </button>
                <button
                  onClick={() => { setEditing(false); setNameInput(account.displayName ?? ""); }}
                  className="flex size-8 items-center justify-center rounded-md border border-border-default/20 text-content-tertiary hover:text-content-primary focus-visible:ring-2 focus-visible:ring-accent-primary/30 focus-visible:outline-none"
                  aria-label="Cancelar edição"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-content-primary">
                  {account.displayName ?? <span className="italic text-content-tertiary">Não definido</span>}
                </p>
                <button
                  onClick={() => setEditing(true)}
                  className="text-content-tertiary hover:text-accent-primary transition-colors"
                  title="Editar nome"
                >
                  <Pencil className="size-3" />
                </button>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              Email
            </label>
            <div className="mt-1 flex items-center gap-2">
              <Mail className="size-3.5 text-content-tertiary" />
              <p className="text-sm text-content-primary">{account.email}</p>
            </div>
          </div>

          {/* Plan */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              Estado da conta
            </label>
            <div className="mt-1 flex items-center gap-2">
              <Shield className="size-3.5 text-content-tertiary" />
              <span className="rounded-full bg-accent-primary/10 px-2.5 py-0.5 text-xs font-medium text-accent-primary">
                Conta ativa
              </span>
            </div>
          </div>

          {/* Created at */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
              Membro desde
            </label>
            <div className="mt-1 flex items-center gap-2">
              <Calendar className="size-3.5 text-content-tertiary" />
              <p className="text-sm text-content-primary">{formatDate(account.createdAt)}</p>
            </div>
          </div>

          {/* Lead email */}
          {account.leadEmail && account.leadEmail !== account.email && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-content-tertiary">
                Email associado (lead)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <Mail className="size-3.5 text-content-tertiary" />
                <p className="text-sm text-content-secondary">{account.leadEmail}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comunicações */}
      {account.leadId && (
        <section className="mt-4 rounded-xl border border-border-default/20 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                <BellRing className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-content-primary">Comunicações</h2>
                <p className="text-xs text-content-tertiary">Gere as preferências de email.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-md">
                <p className="text-sm text-content-primary">
                  Receber novidades e dicas sobre relatórios, análise de Instagram e marketing digital
                </p>
                <p className="mt-1 text-xs text-content-tertiary">
                  Emails estritamente necessários ao funcionamento do serviço podem continuar a ser enviados.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={account.marketingConsent ?? false}
                aria-label="Receber comunicações de marketing"
                onClick={handleToggleConsent}
                disabled={consentSaving}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 disabled:opacity-60 ${
                  account.marketingConsent ? "bg-blue-500" : "bg-surface-muted border border-border-default/30"
                }`}
              >
                <span
                  className={`inline-flex size-4 items-center justify-center transform rounded-full bg-white shadow transition-transform ${
                    account.marketingConsent ? "translate-x-6" : "translate-x-1"
                  }`}
                >
                  {consentSaving && (
                    <Loader2 className="size-3 animate-spin text-content-tertiary" />
                  )}
                </span>
              </button>
            </div>

            {consentError && (
              <p className="mt-3 text-xs text-signal-danger">{consentError}</p>
            )}
        </section>
      )}

      {/* Logout */}
      <div className="mt-4">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 rounded-lg border border-border-default/20 bg-white px-4 py-2.5 text-sm text-content-secondary shadow-sm transition-colors hover:border-signal-danger/30 hover:text-signal-danger focus-visible:ring-2 focus-visible:ring-accent-primary/30 focus-visible:outline-none"
        >
          {loggingOut ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
          Terminar sessão
        </button>
      </div>
    </div>
  );
}
