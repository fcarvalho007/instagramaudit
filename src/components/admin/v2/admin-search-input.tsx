/**
 * AdminSearchInput — input de pesquisa do admin v2.
 *
 * Visual coerente com `PeriodSelect` / `ExportCsvButton`: borda admin,
 * radius lg, ícone `<Search>` à esquerda. Quando o `value` não está vazio,
 * mostra um botão `X` à direita para limpar o campo. Suporta `ref` para
 * que o consumidor possa focar o input programaticamente (ex.: atalho
 * `Cmd+K`).
 */

import { Search, X } from "lucide-react";
import { forwardRef, useId, useImperativeHandle, useRef } from "react";

export interface AdminSearchInputHandle {
  focus: () => void;
}

interface AdminSearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (next: string) => void;
  width?: number;
  ariaLabel?: string;
}

export const AdminSearchInput = forwardRef<
  AdminSearchInputHandle,
  AdminSearchInputProps
>(function AdminSearchInput(
  {
    placeholder = "Pesquisar...",
    value,
    onChange,
    width = 220,
    ariaLabel = "Pesquisar",
  },
  ref,
) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const hasValue = typeof value === "string" && value.length > 0;

  return (
    <label
      htmlFor={id}
      className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5 text-[12px] text-admin-text-secondary transition-colors hover:border-admin-border-strong focus-within:border-admin-border-strong"
      style={{ width }}
    >
      <Search aria-hidden="true" size={14} className="shrink-0 text-admin-text-tertiary" />
      <input
        id={id}
        ref={inputRef}
        type="search"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-[12px] text-admin-text-primary placeholder:text-admin-text-tertiary outline-none"
      />
      {hasValue ? (
        <button
          type="button"
          aria-label="Limpar pesquisa"
          onClick={() => {
            onChange?.("");
            inputRef.current?.focus();
          }}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-admin-text-tertiary transition-colors hover:bg-[var(--color-admin-surface-muted)] hover:text-admin-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-leads-500"
        >
          <X size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : null}
    </label>
  );
});