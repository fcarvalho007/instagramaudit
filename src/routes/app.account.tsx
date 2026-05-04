import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAccountDetails, updateDisplayName } from "@/server/account.functions";
import { User, Calendar, Mail, Shield, LogOut, Pencil, Check, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Conta — InstaBench" },
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
}

const planLabels: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  agency: "Agency",
};

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
        <Loader2 className="size-5 animate-spin text-slate-400" />
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
      <h1 className="text-xl font-semibold tracking-tight text-slate-800">
        Conta
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Informações e definições da conta.
      </p>

      {/* Profile card */}
      <div className="mt-6 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <User className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">
              {account.displayName ?? account.email}
            </p>
            <p className="text-xs text-slate-400">{account.email}</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Display Name — editable */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Nome de apresentação
            </label>
            {editing ? (
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={100}
                  className="h-8 flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="flex size-8 items-center justify-center rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </button>
                <button
                  onClick={() => { setEditing(false); setNameInput(account.displayName ?? ""); }}
                  className="flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-slate-700">
                  {account.displayName ?? <span className="italic text-slate-400">Não definido</span>}
                </p>
                <button
                  onClick={() => setEditing(true)}
                  className="text-slate-300 hover:text-blue-500 transition-colors"
                  title="Editar nome"
                >
                  <Pencil className="size-3" />
                </button>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Email
            </label>
            <div className="mt-1 flex items-center gap-2">
              <Mail className="size-3.5 text-slate-300" />
              <p className="text-sm text-slate-700">{account.email}</p>
            </div>
          </div>

          {/* Plan */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Plano
            </label>
            <div className="mt-1 flex items-center gap-2">
              <Shield className="size-3.5 text-slate-300" />
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-600">
                {planLabels[account.plan] ?? account.plan}
              </span>
            </div>
          </div>

          {/* Created at */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Membro desde
            </label>
            <div className="mt-1 flex items-center gap-2">
              <Calendar className="size-3.5 text-slate-300" />
              <p className="text-sm text-slate-700">{formatDate(account.createdAt)}</p>
            </div>
          </div>

          {/* Lead email */}
          {account.leadEmail && (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Email associado (lead)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <Mail className="size-3.5 text-slate-300" />
                <p className="text-sm text-slate-500">{account.leadEmail}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="mt-4">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm transition-colors hover:border-red-200 hover:text-red-500"
        >
          {loggingOut ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
          Terminar sessão
        </button>
      </div>
    </div>
  );
}
