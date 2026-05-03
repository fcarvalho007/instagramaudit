import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CompetitorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BENEFITS = [
  "Comparação directa com até 2 concorrentes",
  "Gap competitivo por formato e dia",
  "Histórico de evolução cruzado",
] as const;

export function CompetitorModal({ open, onOpenChange }: CompetitorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-medium">
            Comparar com concorrentes
          </DialogTitle>
          <DialogDescription className="text-[13px] text-slate-500">
            Vê o teu perfil lado a lado com até 2 concorrentes directos
          </DialogDescription>
        </DialogHeader>

        {/* Ghost preview chart */}
        <div className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4">
          <GhostChart />
          <p className="mt-3 text-[12px] text-slate-500 leading-relaxed text-center">
            Assim verias o teu perfil comparado com os teus concorrentes directos no mesmo gráfico.
          </p>
        </div>

        {/* Benefits */}
        <ul className="mt-5 space-y-2.5">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[13px] text-slate-700">
              <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="mt-6 flex flex-col gap-2">
          <Button className="w-full">Ver planos PRO</Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Continuar grátis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Static mini bar chart showing user tier + dashed competitor bar */
function GhostChart() {
  const tiers = [
    { label: "1K-5K", h: 50 },
    { label: "5K-20K", h: 35, active: true },
    { label: "20K-100K", h: 45 },
    { label: "100K-1M", h: 30 },
    { label: "+1M", h: 25 },
  ];

  return (
    <div className="flex items-end justify-center gap-3" style={{ height: 100 }}>
      {tiers.map((t) => (
        <div key={t.label} className="flex flex-col items-center gap-1">
          <div className="flex items-end gap-1">
            <div
              className={`w-5 rounded-sm ${t.active ? "bg-slate-400" : "bg-slate-200"}`}
              style={{ height: t.h }}
            />
            {t.active && (
              <div
                className="w-5 rounded-sm border-2 border-dashed border-amber-500/60 bg-transparent"
                style={{ height: t.h * 0.7 }}
              />
            )}
          </div>
          <span className="text-[9px] text-slate-400">{t.label}</span>
        </div>
      ))}
    </div>
  );
}