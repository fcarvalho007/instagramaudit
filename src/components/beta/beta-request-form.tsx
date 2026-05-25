/**
 * 3-step progressive disclosure beta request form.
 * Dark theme, design tokens, no analysis trigger.
 */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Send, Info, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { BetaStepIndicator } from "./beta-step-indicator";
import { submitBetaRequest } from "@/lib/beta.functions";
import { trackEvent } from "@/lib/tracking.functions";

// ── Options ────────────────────────────────────────────────────────

const USER_TYPES = [
  { value: "creator", label: "Criador de conteúdo" },
  { value: "brand", label: "Marca / Empresa" },
  { value: "agency", label: "Agência" },
  { value: "consultant", label: "Consultor" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "other", label: "Outro" },
] as const;

const PURPOSES = [
  { value: "improve_content", label: "Melhorar conteúdo" },
  { value: "benchmark_competitors", label: "Comparar com concorrentes" },
  { value: "client_report", label: "Preparar relatório de cliente" },
  { value: "grow_audience", label: "Crescer audiência" },
  { value: "validate_brand", label: "Validar comunicação de marca" },
  { value: "other", label: "Outro" },
] as const;

const OWNERSHIPS = [
  { value: "own_profile", label: "O meu perfil pessoal" },
  { value: "brand_profile", label: "O perfil da minha marca" },
  { value: "client_profile", label: "O perfil de um cliente" },
] as const;

// ── Form state ─────────────────────────────────────────────────────

interface FormData {
  instagramHandle: string;
  email: string;
  name: string;
  userType: string;
  purpose: string;
  profileOwnership: string;
  betaConsent: boolean;
}

const INITIAL: FormData = {
  instagramHandle: "",
  email: "",
  name: "",
  userType: "",
  purpose: "",
  profileOwnership: "",
  betaConsent: false,
};

export function BetaRequestForm() {
  const navigate = useNavigate();
  const submitFn = useServerFn(submitBetaRequest);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError(null);
  };

  // ── Validation ───────────────────────────────────────────────────

  const validateStep1 = (): boolean => {
    const e: typeof errors = {};
    const handle = form.instagramHandle.replace(/^@/, "").trim();
    if (!handle) e.instagramHandle = "Introduz o handle do Instagram.";
    else if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle))
      e.instagramHandle = "Handle inválido. Usa apenas letras, números, pontos e underscores.";
    if (!form.email.trim()) e.email = "Introduz o teu email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = "Email inválido.";
    if (!form.name.trim()) e.name = "Introduz o teu nome.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: typeof errors = {};
    if (!form.userType) e.userType = "Seleciona o tipo de utilizador.";
    if (!form.purpose) e.purpose = "Seleciona o objetivo.";
    if (!form.profileOwnership) e.profileOwnership = "Indica de quem é o perfil.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = (): boolean => {
    const e: typeof errors = {};
    if (!form.betaConsent) e.betaConsent = "Precisas de aceitar as condições.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Navigation ───────────────────────────────────────────────────

  const next = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const back = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  // ── Submit ───────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const result = await submitFn({
        data: {
          instagramHandle: form.instagramHandle,
          email: form.email,
          name: form.name,
          userType: form.userType,
          purpose: form.purpose,
          profileOwnership: form.profileOwnership,
          betaConsent: true,
        },
      });

      if (result.success) {
        navigate({
          to: "/beta/submitted/$requestId",
          params: { requestId: result.requestId },
        });
      } else if (result.error === "duplicate") {
        setServerError(
          "Já existe um pedido para este perfil com este email. Receberás notificação quando estiver pronto."
        );
      } else {
        setServerError("Erro ao submeter pedido. Tenta novamente.");
      }
    } catch {
      setServerError("Erro de ligação. Tenta novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-lg mx-auto">
      <BetaStepIndicator current={step} />

      {/* Step 1 — Profile */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Badge variant="accent" className="text-eyebrow-sm">
              Beta privada
            </Badge>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-text-primary">
              Análise gratuita do teu perfil de Instagram
            </h1>
            <p className="text-sm text-text-secondary max-w-sm mx-auto">
              Estamos a abrir a plataforma a um grupo limitado de testadores.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="handle" className="text-text-secondary text-sm">
                Handle do Instagram
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">@</span>
                <Input
                  id="handle"
                  placeholder="username"
                  className="pl-7"
                  value={form.instagramHandle}
                  onChange={(e) => set("instagramHandle", e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              {errors.instagramHandle && (
                <p className="text-xs text-signal-negative">{errors.instagramHandle}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-text-secondary text-sm">
                Nome
              </Label>
              <Input
                id="name"
                placeholder="O teu nome"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
              {errors.name && (
                <p className="text-xs text-signal-negative">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-text-secondary text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
              {errors.email && (
                <p className="text-xs text-signal-negative">{errors.email}</p>
              )}
            </div>
          </div>

          <Button className="w-full" onClick={next}>
            Continuar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 2 — Context */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="font-display text-xl font-semibold text-text-primary">
              Ajuda-nos a entender o teu caso
            </h2>
            <p className="text-sm text-text-secondary">
              Estas respostas ajudam-nos a priorizar e personalizar o relatório.
            </p>
          </div>

          {/* User type */}
          <div className="space-y-3">
            <Label className="text-text-secondary text-sm">Tipo de utilizador</Label>
            <RadioGroup
              value={form.userType}
              onValueChange={(v) => set("userType", v)}
              className="grid grid-cols-2 gap-2"
            >
              {USER_TYPES.map((t) => (
                <Label
                  key={t.value}
                  htmlFor={`ut-${t.value}`}
                  className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer text-sm transition-colors ${
                    form.userType === t.value
                      ? "border-accent-primary bg-accent-primary/5 text-text-primary"
                      : "border-border-subtle text-text-secondary hover:border-border-default"
                  }`}
                >
                  <RadioGroupItem value={t.value} id={`ut-${t.value}`} />
                  {t.label}
                </Label>
              ))}
            </RadioGroup>
            {errors.userType && (
              <p className="text-xs text-signal-negative">{errors.userType}</p>
            )}
          </div>

          {/* Purpose */}
          <div className="space-y-3">
            <Label className="text-text-secondary text-sm">Objetivo</Label>
            <RadioGroup
              value={form.purpose}
              onValueChange={(v) => set("purpose", v)}
              className="grid grid-cols-1 gap-2"
            >
              {PURPOSES.map((p) => (
                <Label
                  key={p.value}
                  htmlFor={`pu-${p.value}`}
                  className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer text-sm transition-colors ${
                    form.purpose === p.value
                      ? "border-accent-primary bg-accent-primary/5 text-text-primary"
                      : "border-border-subtle text-text-secondary hover:border-border-default"
                  }`}
                >
                  <RadioGroupItem value={p.value} id={`pu-${p.value}`} />
                  {p.label}
                </Label>
              ))}
            </RadioGroup>
            {errors.purpose && (
              <p className="text-xs text-signal-negative">{errors.purpose}</p>
            )}
          </div>

          {/* Profile ownership */}
          <div className="space-y-3">
            <Label className="text-text-secondary text-sm">Este perfil é</Label>
            <RadioGroup
              value={form.profileOwnership}
              onValueChange={(v) => set("profileOwnership", v)}
              className="grid grid-cols-1 gap-2"
            >
              {OWNERSHIPS.map((o) => (
                <Label
                  key={o.value}
                  htmlFor={`po-${o.value}`}
                  className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer text-sm transition-colors ${
                    form.profileOwnership === o.value
                      ? "border-accent-primary bg-accent-primary/5 text-text-primary"
                      : "border-border-subtle text-text-secondary hover:border-border-default"
                  }`}
                >
                  <RadioGroupItem value={o.value} id={`po-${o.value}`} />
                  {o.label}
                </Label>
              ))}
            </RadioGroup>
            {errors.profileOwnership && (
              <p className="text-xs text-signal-negative">{errors.profileOwnership}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={back} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={next} className="flex-1">
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Terms & Submit */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="font-display text-xl font-semibold text-text-primary">
              Antes de submeter
            </h2>
          </div>

          {/* Beta notices */}
          <div className="space-y-3">
            {[
              {
                icon: Info,
                text: "Isto é uma versão beta. Os relatórios podem demorar até 24h e a disponibilidade é limitada.",
              },
              {
                icon: Info,
                text: "A análise usa exclusivamente dados públicos do Instagram.",
              },
              {
                icon: Info,
                text: "Poderemos pedir-te feedback breve sobre o relatório.",
              },
              {
                icon: Info,
                text: "O serviço é gratuito durante a fase beta. Futuramente, aplicar-se-ão planos pagos.",
              },
            ].map((notice, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-elevated/50 p-3"
              >
                <notice.icon className="h-4 w-4 mt-0.5 text-accent-primary shrink-0" />
                <p className="text-sm text-text-secondary leading-relaxed">
                  {notice.text}
                </p>
              </div>
            ))}
          </div>

          {/* Future pricing (subtle) */}
          <div
            className="rounded-lg border border-accent-gold/20 bg-accent-gold/5 p-4 cursor-pointer"
            onClick={() =>
              trackEvent({
                data: {
                  eventType: "pricing_clicked",
                  handle: form.instagramHandle.replace(/^@/, "").toLowerCase() || undefined,
                  metadata: { plan_clicked: "pricing_card" },
                },
              }).catch(() => {})
            }
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-accent-gold" />
              <span className="text-eyebrow-sm text-accent-gold">Preços</span>
            </div>
            <div className="space-y-1.5 text-sm text-text-secondary">
              <div className="flex justify-between">
                <span>1 relatório</span>
                <span className="text-text-primary font-medium">7€</span>
              </div>
              <div className="flex justify-between">
                <span>Pack de 5 relatórios</span>
                <span className="text-text-primary font-medium">28€ <span className="text-text-muted font-normal">(5,60€/relatório)</span></span>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Sem subscrição. Sem renovação automática. Pagamento brevemente disponível — o pedido beta apenas regista o teu interesse.
            </p>
          </div>

          {/* Consent */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent"
                checked={form.betaConsent}
                onCheckedChange={(checked) =>
                  set("betaConsent", checked === true)
                }
                className="mt-0.5"
              />
              <Label
                htmlFor="consent"
                className="text-sm text-text-secondary leading-relaxed cursor-pointer"
              >
                Li e aceito as condições da beta e a{" "}
                <a href="/privacidade" className="text-accent-primary underline" target="_blank">
                  política de privacidade
                </a>
                .
              </Label>
            </div>
            {errors.betaConsent && (
              <p className="text-xs text-signal-negative">{errors.betaConsent}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-lg border border-signal-negative/30 bg-signal-negative/5 p-3">
              <p className="text-sm text-signal-negative">{serverError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={back} className="flex-1" disabled={submitting}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={submitting}>
              {submitting ? (
                "A submeter…"
              ) : (
                <>
                  Submeter <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}