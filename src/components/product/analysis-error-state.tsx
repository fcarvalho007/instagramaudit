import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

interface AnalysisErrorStateProps {
  message?: string;
  errorCode?: string;
  onRetry: () => void;
}

const CACHE_ONLY_HEADING =
  "Este relatório ainda não tem dados públicos disponíveis.";
const CACHE_ONLY_BODY =
  "Os dados deste perfil ainda não foram gerados ou a versão guardada expirou. Tenta novamente mais tarde ou solicita uma nova análise.";

export function AnalysisErrorState({
  message,
  errorCode,
  onRetry,
}: AnalysisErrorStateProps) {
  const isCacheOnly = errorCode?.toUpperCase() === "CACHE_ONLY_NO_DATA";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #F6FAFF 0%, #FFFFFF 100%)" }}>
      <Container size="md" as="section" className="py-20 md:py-32">
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-border-default bg-surface-secondary text-content-secondary">
            <AlertCircle className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <span className="text-eyebrow-sm text-[0.625rem] text-content-tertiary">
              Análise indisponível
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-medium text-content-primary tracking-tight">
              {isCacheOnly
                ? CACHE_ONLY_HEADING
                : "Não foi possível concluir a análise"}
            </h1>
            <p className="font-sans text-sm text-content-secondary leading-relaxed">
              {isCacheOnly
                ? CACHE_ONLY_BODY
                : (message ??
                "Não foi possível analisar este perfil neste momento. Tentar novamente dentro de instantes."}
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              variant="primary"
              size="md"
              leftIcon={<RotateCcw />}
              onClick={onRetry}
            >
              Tentar novamente
            </Button>
            {isCacheOnly && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<ArrowLeft />}
                asChild
              >
                <Link to="/">Voltar ao início</Link>
              </Button>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
