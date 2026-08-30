import { Link, useRouterState } from "@tanstack/react-router";
import { FileText, User, CreditCard, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { endLeadSession } from "@/lib/rpc/lead-session.functions";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Relatórios", to: "/app/reports" as const, icon: FileText },
  { label: "Conta", to: "/app/account" as const, icon: User },
  { label: "Plano", to: "/app/plan" as const, icon: CreditCard },
];

interface AppSidebarProps {
  userEmail?: string;
  userName?: string;
}

export function AppSidebar({ userEmail, userName }: AppSidebarProps) {
  const currentPath = useRouterState({
    select: (s) => s.location.pathname,
  });

  const handleLogout = async () => {
    // Termina ambos os caminhos de sessão: Supabase Auth (histórico) e
    // `lead_session` (passwordless). Sair tem de sair mesmo.
    await Promise.allSettled([supabase.auth.signOut(), endLeadSession()]);
    window.location.href = "/login";
  };

  return (
    <aside className="hidden md:flex md:w-[240px] md:shrink-0 md:flex-col md:border-r md:border-slate-200/80 md:bg-white">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-5">
        <BrandMark size={24} />
        <span className="text-[15px] font-semibold tracking-tight text-slate-900">
          AuditProfiles
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = currentPath.startsWith(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="mb-2 truncate text-sm font-medium text-slate-700">
          {userName || userEmail || "—"}
        </div>
        {userName && userEmail && (
          <div className="mb-2 truncate text-xs text-slate-400">{userEmail}</div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          <LogOut className="size-3.5" />
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}
