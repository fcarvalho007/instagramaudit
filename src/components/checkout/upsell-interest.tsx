import { Briefcase, GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

export interface UpsellValue {
  audit: boolean;
  workshop: boolean;
}

interface Props {
  value: UpsellValue;
  onChange: (next: UpsellValue) => void;
}

export function UpsellInterest({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-content-secondary leading-relaxed">
        Estes serviços não são cobrados agora. É apenas um sinal de interesse
        — entramos em contacto se fizer sentido.
      </p>
      <InterestCard
        icon={<Briefcase className="size-5" aria-hidden="true" />}
        title="Auditoria Digital completa"
        priceHint="desde 499€ + IVA"
        description="Website, Google, concorrência, conteúdo, reputação, email e redes sociais."
        checked={value.audit}
        onToggle={(v) => onChange({ ...value, audit: v })}
      />
      <InterestCard
        icon={<GraduationCap className="size-5" aria-hidden="true" />}
        title="Workshop para equipa"
        priceHint="sob proposta"
        description="Sessão prática para transformar dados em decisões, calendário editorial e processos de marketing."
        checked={value.workshop}
        onToggle={(v) => onChange({ ...value, workshop: v })}
      />
    </div>
  );
}

function InterestCard({
  icon,
  title,
  priceHint,
  description,
  checked,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  priceHint: string;
  description: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-white p-4 cursor-pointer transition-colors",
        checked
          ? "border-accent-primary ring-1 ring-accent-primary/30"
          : "border-border-default hover:border-content-tertiary",
      )}
    >
      <span className="mt-0.5 inline-flex items-center justify-center rounded-md bg-accent-primary/10 text-accent-primary p-1.5">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-content-primary">
            {title}
          </h3>
          <span className="text-xs text-content-tertiary tabular-nums shrink-0">
            {priceHint}
          </span>
        </div>
        <p className="mt-1 text-xs text-content-secondary leading-relaxed">
          {description}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
            className="size-4 accent-accent-primary"
          />
          <span className="text-xs text-content-secondary">
            Tenho interesse, contactem-me
          </span>
        </div>
      </div>
    </label>
  );
}