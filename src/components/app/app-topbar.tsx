import { Link, useRouterState } from "@tanstack/react-router";
import { FileText, User, CreditCard, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Relatórios", to: "/app/reports" as const, icon: FileText },
  { label: "Conta", to: "/app/account" as const, icon: User },
  { label: "Plano", to: "/app/plan" as const, icon: CreditCard },
];

interface AppTopbarProps {
  userEmail?: string;
}

export function AppTopbar({ userEmail }: AppTopbarProps) {
  const [open, setOpen] = useState(false);
  const currentPath = useRouterState({
    select: (s) => s.location.pathname,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="md:hidden border-b border-slate-200/80 bg-white">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <BrandMark size={22} />
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            AuditProfiles
          </span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-slate-100 px-4 pb-3 pt-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const active = currentPath.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
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

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="truncate text-xs text-slate-400">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-slate-600"
            >
              <LogOut className="size-3.5" />
              Sair
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
