import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface UnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user submits step 1. UI-only — no backend call. */
  onUnlock: (email: string) => void;
}

/**
 * Step 1 of the unlock flow — visual only. Captures the email and
 * triggers the local unlock callback. Steps 2–5 (ownership, goal,
 * user type, commercial interest) ship in a later phase.
 */
export function UnlockModal({ open, onOpenChange, onUnlock }: UnlockModalProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    onUnlock(trimmed);
    setEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <p className="text-eyebrow-sm text-primary">Passo 1 de 5</p>
          <DialogTitle className="font-fraunces text-2xl leading-tight">
            O teu email
          </DialogTitle>
          <DialogDescription className="text-sm text-content-secondary">
            Vamos guardar o teu relatório para acesso futuro na tua área
            pessoal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="unlock-email" className="text-sm">
              Email
            </Label>
            <Input
              id="unlock-email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="ana@empresa.pt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Continuar
          </Button>

          <div className="flex items-start gap-2 rounded-lg bg-surface-muted/60 p-3">
            <ShieldCheck
              className="size-4 shrink-0 mt-0.5 text-primary"
              aria-hidden="true"
            />
            <p className="text-xs text-content-tertiary leading-relaxed">
              Usamos o teu email só para enviar o relatório e dar-te acesso à
              área pessoal. Sem spam.
            </p>
          </div>

          {import.meta.env.DEV ? (
            <p className="text-xs text-content-tertiary text-center italic">
              Pré-visualização — passos 2 a 5 chegam na próxima fase.
            </p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}