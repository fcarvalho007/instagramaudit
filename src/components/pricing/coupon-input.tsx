import { useState } from "react";
import { Loader2, Tag, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { checkCoupon } from "@/lib/payments/coupons.functions";
import type { ProductCode } from "@/lib/payments/products";

interface Props {
  productCode: ProductCode;
  onApplied: (couponCode: string | null) => void;
  appliedCode: string | null;
  className?: string;
}

/**
 * Discreet "Tenho um código de acesso" affordance. Hidden behind a small
 * link until the visitor opens it. Validation goes through the server
 * function so the client never decides whether a code is real.
 */
export function CouponInput({
  productCode,
  onApplied,
  appliedCode,
  className,
}: Props) {
  const validate = useServerFn(checkCoupon);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = value.trim();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const result = await validate({
        data: { code, product_code: productCode },
      });
      if (result.valid) {
        onApplied(code.toUpperCase());
        setOpen(false);
      } else {
        setError(
          result.reason === "expired"
            ? "Este código expirou."
            : result.reason === "exhausted"
              ? "Este código já não tem utilizações disponíveis."
              : result.reason === "not_applicable"
                ? "Este código não se aplica a este produto."
                : "Código inválido.",
        );
      }
    } catch {
      setError("Não foi possível validar o código.");
    } finally {
      setLoading(false);
    }
  };

  if (appliedCode) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 text-xs text-accent-primary",
          className,
        )}
      >
        <Tag className="size-3.5" aria-hidden="true" />
        <span className="font-medium">Código {appliedCode} aplicado</span>
        <button
          type="button"
          onClick={() => onApplied(null)}
          className="ml-1 inline-flex items-center text-content-tertiary hover:text-content-primary"
          aria-label="Remover código"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-content-tertiary hover:text-accent-primary transition-colors",
          className,
        )}
      >
        <Tag className="size-3.5" aria-hidden="true" />
        Tenho um código de acesso
      </button>
    );
  }

  return (
    <form
      onSubmit={handleApply}
      className={cn("flex flex-col gap-1.5 max-w-xs", className)}
    >
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="CÓDIGO"
          maxLength={40}
          className="h-9 text-sm uppercase tracking-wider"
          disabled={loading}
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={loading || !value.trim()}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            "Aplicar"
          )}
        </Button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setValue("");
            setError(null);
          }}
          className="text-content-tertiary hover:text-content-primary p-1"
          aria-label="Cancelar"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : null}
    </form>
  );
}