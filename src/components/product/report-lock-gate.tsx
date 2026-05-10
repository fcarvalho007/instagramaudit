import type { ReactNode } from "react";
import { Lock, Sparkles, BarChart3, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReportLockGateProps {
  unlocked: boolean;
  onUnlockClick: () => void;
  children: ReactNode;
  /** Optional id for scroll anchoring. */
  id?: string;
}

/**
 * Visual-only lock gate. When `unlocked` is false, renders `children`
 * with a heavy blur + frosted gradient and an overlaid CTA card inviting
 * the user to start the unlock flow. No backend, no persistence.
 *
 * Used in the public report (`/analyze/$username`) to gate content from
 * the "Taxa de Engagement" card onward.
 */
export function ReportLockGate({
  unlocked,
  onUnlockClick,
  children,
  id,
}: ReportLockGateProps) {
  if (unlocked) return <>{children}</>;

  return (
    <div id={id} className="relative isolate">
      {/* Blurred content (kept in DOM for layout, hidden from a11y/focus) */}
      <div
        aria-hidden="true"
        // @ts-expect-error inert is a valid HTML attr but missing from React types in some setups
        inert=""
        className="select-none pointer-events-none"
        style={{
          filter: "blur(10px) saturate(0.85)",
          WebkitFilter: "blur(10px) saturate(0.85)",
        }}
      >
        {children}
      </div>

      {/* Top fade — easing the transition from clear → blurred */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-surface-base via-surface-base/70 to-transparent"
      />

      {/* CTA overlay */}
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <div
          role="region"
          aria-label="Desbloquear relatório completo"
          className={cn(
            "pointer-events-auto sticky self-start",
            "top-24 mt-24 md:mt-32",
            "w-[calc(100%-32px)] max-w-md",
            "rounded-2xl border border-border-default bg-surface-card",
            "shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)]",
            "p-6 md:p-8",
          )}
        >
          <p className="text-eyebrow-sm text-primary">Análise completa</p>
          <h2 className="mt-2 font-fraunces text-2xl md:text-3xl leading-tight text-content-primary">
            Desbloquear análise completa
          </h2>
          <p className="mt-3 text-sm md:text-[15px] text-content-secondary leading-relaxed">
            Já preparámos o resto do relatório. Indica o email e responde a
            algumas perguntas rápidas para aceder à análise completa.
          </p>

          <ul className="mt-5 space-y-2.5">
            <BenefitRow
              icon={<BarChart3 className="size-4" aria-hidden="true" />}
              text="Comparação com o benchmark do teu escalão"
            />
            <BenefitRow
              icon={<Sparkles className="size-4" aria-hidden="true" />}
              text="Análise por formato e melhores horários"
            />
            <BenefitRow
              icon={<Lock className="size-4" aria-hidden="true" />}
              text="Insights AI personalizados ao perfil"
            />
          </ul>

          <Button
            type="button"
            onClick={onUnlockClick}
            className="mt-6 w-full"
            size="lg"
          >
            Desbloquear relatório gratuito
          </Button>

          <p className="mt-3 text-xs text-content-tertiary text-center">
            Acesso gratuito durante a beta · demora cerca de 1 minuto
          </p>
        </div>
      </div>

      {import.meta.env.DEV ? <DevResetButton /> : null}
    </div>
  );
}

function BenefitRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full bg-surface-muted text-primary">
        {icon}
      </span>
      <span className="text-sm text-content-secondary leading-relaxed">
        {text}
      </span>
    </li>
  );
}

function DevResetButton() {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          window.sessionStorage.removeItem("ib_unlock_preview");
        } catch {
          /* ignore */
        }
        window.location.reload();
      }}
      className="fixed bottom-4 right-4 z-50 rounded-full border border-border-default bg-surface-card px-3 py-1.5 text-xs text-content-tertiary shadow-md hover:text-content-primary"
    >
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        Reset preview unlock
      </span>
    </button>
  );
}