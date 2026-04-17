import { useState } from "react";
import { Check, CheckCircle2, Crown, FileText, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, InputHelper, InputLabel } from "@/components/ui/input";

import { cn } from "@/lib/utils";
/**
 * Quota is now enforced server-side by `/api/request-full-report`. The modal
 * no longer pre-checks usage — it submits and maps the server's `quota_status`
 * verdict (`first_free` / `last_free` / `limit_reached`) onto UI state.
 */
import { FREE_MONTHLY_LIMIT, normalizeEmail } from "@/lib/quota";
import { requestFullReport } from "@/integrations/supabase/queries/report-requests";

export interface GateFormData {
  nome: string;
  email: string;
  empresa?: string;
  rgpdAcceptedAt: string;
}

interface ReportGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username?: string;
  /** Snapshot id of the analysis the user is currently viewing. */
  analysisSnapshotId?: string;
  onSubmit?: (data: GateFormData) => Promise<void> | void;
  /**
   * Fired whenever the server returns a definitive outcome for the request.
   * Lets the parent (e.g. analysis dashboard) lift conversion state without
   * duplicating form logic. Optional and side-effect free for the modal UX.
   */
  onRequestOutcome?: (outcome: "success" | "limit-reached") => void;
}

type ModalState = "idle" | "submitting" | "success" | "success-last" | "paywall";

interface FormErrors {
  nome?: string;
  email?: string;
  rgpd?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALUE_ITEMS = [
  "PDF detalhado por email",
  "Comparação com concorrentes",
  "Insights estratégicos por IA",
  "Recomendações prioritárias para 30 dias",
];

function validate(values: { nome: string; email: string; rgpd: boolean }): FormErrors {
  const errors: FormErrors = {};
  if (values.nome.trim().length < 2) {
    errors.nome = "Indicar o nome para personalizar o relatório";
  }
  if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Inserir um email válido";
  }
  if (!values.rgpd) {
    errors.rgpd = "É necessário aceitar a política de privacidade para continuar";
  }
  return errors;
}

export function ReportGateModal({
  open,
  onOpenChange,
  username,
  analysisSnapshotId,
  onSubmit,
  onRequestOutcome,
}: ReportGateModalProps) {
  const [state, setState] = useState<ModalState>("idle");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [rgpd, setRgpd] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Server-reported remaining free reports for the current month (post-insert).
  // Drives the quota line copy without trusting any client storage.
  const [remainingFree, setRemainingFree] = useState<number | null>(null);

  const resetForm = () => {
    setState("idle");
    setNome("");
    setEmail("");
    setEmpresa("");
    setRgpd(false);
    setErrors({});
    setTouched({});
    setSubmitError(null);
    setRemainingFree(null);
  };

  // Synchronous reset on close — avoids flash on rapid reopen
  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleBlur = (field: keyof FormErrors) => {
    setTouched((t) => ({ ...t, [field]: true }));
    const next = validate({ nome, email, rgpd });
    setErrors((e) => ({ ...e, [field]: next[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate({ nome, email, rgpd });
    setErrors(next);
    setTouched({ nome: true, email: true, rgpd: true });
    if (Object.keys(next).length > 0) return;

    const normalizedEmail = normalizeEmail(email);

    setState("submitting");
    setSubmitError(null);
    const data: GateFormData = {
      nome: nome.trim(),
      email: normalizedEmail,
      empresa: empresa.trim() || undefined,
      rgpdAcceptedAt: new Date().toISOString(),
    };

    try {
      // When a parent provides `onSubmit`, defer entirely to it (used in tests
      // / storybook / alternative flows). The server-enforced quota only
      // applies to the default backend path.
      if (onSubmit) {
        await onSubmit(data);
        setState("success");
        return;
      }

      const result = await requestFullReport({
        email: data.email,
        name: data.nome,
        company: data.empresa,
        instagram_username: username ?? "",
        competitor_usernames: [],
        request_source: "public_dashboard",
        analysis_snapshot_id: analysisSnapshotId,
      });

      // Map server-decided quota outcome → modal state.
      if (result.success) {
        setRemainingFree(result.remaining_free_reports);
        setState(result.quota_status === "last_free" ? "success-last" : "success");
        return;
      }

      if (result.error_code === "QUOTA_REACHED") {
        setRemainingFree(0);
        setState("paywall");
        return;
      }

      setSubmitError(result.message);
      setState("idle");
    } catch (err) {
      console.error("Report request submission failed", err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível concluir o pedido. Tentar novamente.";
      setSubmitError(message);
      setState("idle");
    }
  };

  const isSubmitting = state === "submitting";
  const handleDisplay = username ? `@${username}` : "do perfil analisado";

  // Quota line is driven by the server's `remaining_free_reports`. Falls back
  // to a sensible default if the server response did not carry a remaining count
  // (e.g. parent-provided onSubmit path).
  const usedFromServer =
    remainingFree !== null
      ? Math.max(0, FREE_MONTHLY_LIMIT - remainingFree)
      : state === "success-last"
        ? FREE_MONTHLY_LIMIT
        : 1;
  const renderQuotaLine = () => (
    <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-content-tertiary">
      {usedFromServer} de {FREE_MONTHLY_LIMIT} relatórios utilizados este mês
    </p>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "bg-surface-secondary border-border-default rounded-2xl p-0 overflow-hidden",
          "max-w-md md:max-w-lg shadow-elevated",
        )}
      >
        {state === "success" && (
          <div
            className="flex flex-col items-center text-center gap-5 p-6 md:p-8"
            aria-live="polite"
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-accent-violet/10 border border-accent-violet/40 text-accent-violet-luminous shadow-glow-violet">
              <CheckCircle2 className="size-8" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="font-display text-2xl md:text-3xl font-medium text-content-primary tracking-tight">
                Pedido recebido
              </DialogTitle>
              <DialogDescription className="font-sans text-base text-content-secondary">
                O relatório de {handleDisplay} será enviado para{" "}
                <span className="text-content-primary font-medium">{email}</span> nos próximos
                minutos.
              </DialogDescription>
            </div>
            {renderQuotaLine()}
            <DialogClose asChild>
              <Button variant="primary" size="md" className="w-full md:w-auto">
                Continuar
              </Button>
            </DialogClose>
          </div>
        )}

        {state === "success-last" && (
          <div
            className="flex flex-col items-center text-center gap-5 p-6 md:p-8"
            aria-live="polite"
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-accent-violet/10 border border-accent-violet/40 text-accent-violet-luminous shadow-glow-violet">
              <CheckCircle2 className="size-8" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="font-display text-2xl md:text-3xl font-medium text-content-primary tracking-tight">
                Pedido recebido
              </DialogTitle>
              <DialogDescription className="font-sans text-base text-content-secondary">
                O relatório será enviado para{" "}
                <span className="text-content-primary font-medium">{email}</span> nos próximos
                minutos.
              </DialogDescription>
            </div>

            <div className="w-full rounded-xl border border-accent-gold/30 bg-accent-gold/5 px-4 py-3.5 text-left">
              <div className="flex items-start gap-2.5">
                <Sparkles className="size-4 mt-0.5 shrink-0 text-accent-gold" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-sans text-sm text-content-primary font-medium">
                    Foi utilizado o segundo e último relatório gratuito deste mês.
                  </p>
                  <p className="font-sans text-xs text-content-secondary leading-relaxed">
                    Para mais relatórios: compra pontual ou acesso Pro.
                  </p>
                </div>
              </div>
            </div>

            {renderQuotaLine()}

            <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-center gap-3 w-full">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setState("paywall")}
                className="w-full md:w-auto"
              >
                Ver opções de upgrade
              </Button>
              <DialogClose asChild>
                <Button variant="primary" size="md" className="w-full md:w-auto">
                  Continuar
                </Button>
              </DialogClose>
            </div>
          </div>
        )}

        {state === "paywall" && (
          <div className="flex flex-col p-6 md:p-8 gap-6" aria-live="polite">
            <header className="space-y-2 text-center">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-accent-gold">
                Limite mensal atingido
              </span>
              <DialogTitle className="font-display text-2xl md:text-3xl font-medium text-content-primary tracking-tight">
                2 relatórios gratuitos já utilizados este mês
              </DialogTitle>
              <DialogDescription className="font-sans text-sm md:text-base text-content-secondary">
                Continuar com compra pontual ou acesso Pro.
              </DialogDescription>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* One-time purchase */}
              <div className="flex flex-col rounded-xl border border-border-default bg-surface-base/40 p-4 gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-accent-luminous" aria-hidden="true" />
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-content-tertiary">
                    Compra pontual
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="font-display text-xl text-content-primary font-medium tracking-tight">
                    1 relatório
                  </p>
                  <p className="font-sans text-sm text-content-secondary">
                    <span className="text-content-primary font-medium">3 €</span> · pagamento único
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled
                  className="w-full mt-auto"
                  title="Disponível em breve"
                >
                  Desbloquear novo relatório
                </Button>
              </div>

              {/* Pro subscription */}
              <div className="relative flex flex-col rounded-xl border border-accent-gold/40 bg-accent-gold/5 p-4 gap-3 shadow-glow-gold">
                <span className="absolute -top-2 right-3 rounded-full bg-accent-gold px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-text-inverse">
                  Recomendado
                </span>
                <div className="flex items-center gap-2">
                  <Crown className="size-4 text-accent-gold" aria-hidden="true" />
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-accent-gold">
                    Acesso Pro
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="font-display text-xl text-content-primary font-medium tracking-tight">
                    Relatórios ilimitados
                  </p>
                  <p className="font-sans text-sm text-content-secondary">
                    <span className="text-content-primary font-medium">10 €</span> /mês
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled
                  className="w-full mt-auto"
                  title="Disponível em breve"
                >
                  Ver plano Pro
                </Button>
              </div>
            </div>

            <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-content-tertiary text-center">
              A quota reinicia no início do próximo mês
            </p>

            <DialogClose asChild>
              <Button variant="ghost" size="md" className="w-full md:w-auto md:self-center">
                Fechar
              </Button>
            </DialogClose>
          </div>
        )}

        {(state === "idle" || state === "submitting") && (
          <form onSubmit={handleSubmit} className="flex flex-col" noValidate>
            <div className="p-6 md:p-8 space-y-6">
              <header className="space-y-2">
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
                  Relatório completo
                </span>
                <DialogTitle className="font-display text-2xl md:text-3xl font-medium text-content-primary tracking-tight">
                  Receber relatório completo por email
                </DialogTitle>
                <DialogDescription className="font-sans text-sm md:text-base text-content-secondary">
                  Inclui comparação com concorrentes, benchmark e leitura estratégica por IA.
                </DialogDescription>
              </header>

              <ul className="space-y-2.5" aria-label="Conteúdo do relatório">
                {VALUE_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-luminous">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    <span className="font-sans text-sm text-content-secondary">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-4">
                <div>
                  <InputLabel htmlFor="gate-nome">Nome</InputLabel>
                  <Input
                    id="gate-nome"
                    type="text"
                    autoComplete="name"
                    placeholder="Nome próprio"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    onBlur={() => handleBlur("nome")}
                    error={touched.nome && !!errors.nome}
                    aria-describedby={errors.nome ? "gate-nome-error" : undefined}
                    disabled={isSubmitting}
                  />
                  {touched.nome && errors.nome && (
                    <InputHelper id="gate-nome-error" error>
                      {errors.nome}
                    </InputHelper>
                  )}
                </div>

                <div>
                  <InputLabel htmlFor="gate-email">Email</InputLabel>
                  <Input
                    id="gate-email"
                    type="email"
                    autoComplete="email"
                    placeholder="email@dominio.pt"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur("email")}
                    error={touched.email && !!errors.email}
                    aria-describedby={errors.email ? "gate-email-error" : undefined}
                    disabled={isSubmitting}
                  />
                  {touched.email && errors.email && (
                    <InputHelper id="gate-email-error" error>
                      {errors.email}
                    </InputHelper>
                  )}
                </div>

                <div>
                  <InputLabel htmlFor="gate-empresa">Empresa (opcional)</InputLabel>
                  <Input
                    id="gate-empresa"
                    type="text"
                    autoComplete="organization"
                    placeholder="Nome da empresa ou marca"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <Checkbox
                      checked={rgpd}
                      onCheckedChange={(checked) => {
                        const value = checked === true;
                        setRgpd(value);
                        if (touched.rgpd) {
                          setErrors((e) => ({
                            ...e,
                            rgpd: value
                              ? undefined
                              : "É necessário aceitar a política de privacidade para continuar",
                          }));
                        }
                      }}
                      onBlur={() => handleBlur("rgpd")}
                      disabled={isSubmitting}
                      aria-describedby={errors.rgpd ? "gate-rgpd-error" : undefined}
                      className="mt-0.5"
                    />
                    <span className="font-sans text-sm text-content-secondary leading-relaxed">
                      Aceito receber o relatório por email e a política de privacidade.
                    </span>
                  </label>
                  {touched.rgpd && errors.rgpd && (
                    <InputHelper id="gate-rgpd-error" error className="mt-0">
                      {errors.rgpd}
                    </InputHelper>
                  )}
                </div>
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                className="mx-6 md:mx-8 -mt-2 rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-4 py-3"
              >
                <p className="font-sans text-sm text-signal-danger">{submitError}</p>
              </div>
            )}

            <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-end gap-3 px-6 md:px-8 py-5 border-t border-border-subtle bg-surface-base/30">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmitting}
                leftIcon={!isSubmitting ? <FileText /> : undefined}
                className="w-full md:w-auto"
              >
                {isSubmitting ? "A preparar relatório…" : "Receber relatório completo"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
