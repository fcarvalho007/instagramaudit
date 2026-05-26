import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
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

export function CompetitorModal({ open, onOpenChange }: CompetitorModalProps) {
  const { t } = useTranslation("report");
  const benefits = [
    t("competitor.benefit_compare"),
    t("competitor.benefit_gap"),
    t("competitor.benefit_history"),
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-medium">
            {t("competitor.title")}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-slate-500">
            {t("competitor.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Ghost preview chart */}
        <div className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 animate-fade-in">
          <GhostChart />
          <p className="mt-3 text-[12px] text-slate-500 leading-relaxed text-center">
            {t("competitor.preview_caption")}
          </p>
        </div>

        {/* Benefits */}
        <ul className="mt-5 space-y-2.5">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 text-[13px] text-slate-700">
              <Check className="size-[18px] text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="mt-6 flex flex-col gap-2">
          <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.4)]">
            {t("competitor.cta_pro")}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            {t("competitor.cta_free")}
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
          <span className="text-[11px] text-content-tertiary">{t.label}</span>
        </div>
      ))}
    </div>
  );
}