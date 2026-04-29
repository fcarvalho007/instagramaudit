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
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-content-secondary">
            {label}
          </p>
          {title && (
            <h2 className="font-sans text-[22px] md:text-[24px] font-medium tracking-[-0.01em] text-content-primary leading-[1.2]">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-[13px] text-content-secondary max-w-2xl leading-[1.5]">
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
