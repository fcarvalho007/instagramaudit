/**
 * FilterPills — grupo partilhado de pills de filtro para tabelas do admin.
 *
 * Substitui as cópias inline em Relatórios, Perfis e Clientes. Reutiliza
 * `AdminActionButton` para coerência visual (mesma altura, focus ring,
 * tokens admin). Genérico no tipo de chave `T extends string`.
 */

import { AdminActionButton } from "./admin-action-button";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterPillsProps<T extends string> {
  options: ReadonlyArray<FilterOption<T>>;
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
}

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = "Filtros",
}: FilterPillsProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap items-center gap-1.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <AdminActionButton
            key={opt.value}
            size="sm"
            variant={active ? "active" : "default"}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
          >
            {opt.label}
            {opt.count != null ? (
              <span
                className={
                  active
                    ? "ml-1 text-admin-text-secondary"
                    : "ml-1 text-admin-text-tertiary"
                }
              >
                · {opt.count}
              </span>
            ) : null}
          </AdminActionButton>
        );
      })}
    </div>
  );
}