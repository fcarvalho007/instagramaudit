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
        description="Website, Google, concorrência, conteúdo, reputação, email e redes sociais."
        microcopy="Serviço sob proposta, com planos desde 499€ + IVA."
        checkboxLabel="Tenho interesse numa auditoria"
        checked={value.audit}
        onToggle={(v) => onChange({ ...value, audit: v })}
      />
      <InterestCard
        icon={<GraduationCap className="size-5" aria-hidden="true" />}
        title="Workshop para equipa"
        description="Sessão prática para transformar dados em plano editorial, decisões e processos."
        microcopy="Sob proposta, conforme objectivos e duração."
        checkboxLabel="Tenho interesse num workshop"
        checked={value.workshop}
        onToggle={(v) => onChange({ ...value, workshop: v })}
      />
    </div>
  );
}

function InterestCard({
  icon,
  title,
  description,
  microcopy,
  checkboxLabel,
  checked,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  microcopy: string;
  checkboxLabel: string;
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
        <h3 className="text-sm font-semibold text-content-primary">
          {title}
        </h3>
        <p className="mt-1 text-xs text-content-secondary leading-relaxed">
          {description}
        </p>
        <p className="mt-1 text-xs text-content-tertiary leading-relaxed">
          {microcopy}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onToggle(e.target.checked)}
            className="size-4 accent-accent-primary"
          />
          <span className="text-xs text-content-secondary">
            {checkboxLabel}
          </span>
        </div>
      </div>
    </label>
  );
}