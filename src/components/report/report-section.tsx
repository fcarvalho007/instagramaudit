import { cn } from "@/lib/utils";

interface ReportSectionProps {
  label: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ReportSection({
  label,
  title,
  subtitle,
  action,
  children,
  className,
}: ReportSectionProps) {
  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-content-tertiary">
            {label}
          </p>
          {title && (
            <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-content-primary leading-tight">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm text-content-secondary max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
