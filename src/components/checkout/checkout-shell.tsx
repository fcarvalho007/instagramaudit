import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

interface Props {
  children: ReactNode;
}

/**
 * Minimal checkout layout: logo, lock badge, and a centered column.
 * Intentionally has no global nav, no account menu, and no report sidebar.
 * Steps render their own progress indicator inside `children`.
 */
export function CheckoutShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      <header className="border-b border-border-default bg-white">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="font-fraunces text-base font-medium text-content-primary tracking-tight"
          >
            AuditProfiles
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-content-tertiary">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Pagamento seguro
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">{children}</div>
      </main>

      <footer className="border-t border-border-default bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-content-tertiary">
          <span>© AuditProfiles · pagamento processado por EuPago</span>
          <div className="flex items-center gap-3">
            <Link to="/termos" className="hover:text-content-secondary">
              Termos
            </Link>
            <Link to="/privacidade" className="hover:text-content-secondary">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}