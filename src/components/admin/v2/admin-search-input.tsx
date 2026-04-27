/**
 * AdminSearchInput — input de pesquisa do admin v2.
 *
 * Visual coerente com `PeriodSelect` / `ExportCsvButton`: borda admin,
 * radius lg, ícone `<Search>` à esquerda. Não filtra dados (mock visual).
 */

import { Search } from "lucide-react";
import { useId } from "react";

interface AdminSearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (next: string) => void;
  width?: number;
  ariaLabel?: string;
}

export function AdminSearchInput({
  placeholder = "Pesquisar...",
  value,
  onChange,
  width = 220,
  ariaLabel = "Pesquisar",
}: AdminSearchInputProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5 text-[12px] text-admin-text-secondary transition-colors hover:border-admin-border-strong focus-within:border-admin-border-strong"
      style={{ width }}
    >
      <Search aria-hidden="true" size={14} className="shrink-0 text-admin-text-tertiary" />
      <input
        id={id}
        type="search"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-[12px] text-admin-text-primary placeholder:text-admin-text-tertiary outline-none"
      />
    </label>
  );
}