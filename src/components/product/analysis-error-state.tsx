import { AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

interface AnalysisErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function AnalysisErrorState({
  message,
  onRetry,
}: AnalysisErrorStateProps) {
  return (
    <div className="bg-surface-base">
      <Container size="md" as="section" className="py-20 md:py-32">
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-border-default bg-surface-secondary text-content-secondary">
            <AlertCircle className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
              Análise indisponível
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-medium text-content-primary tracking-tight">
              Não foi possível concluir a análise
            </h1>
            <p className="font-sans text-sm text-content-secondary leading-relaxed">
              {message ??
                "Não foi possível analisar este perfil neste momento. Tentar novamente dentro de instantes."}
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<RotateCcw />}
            onClick={onRetry}
          >
            Tentar novamente
          </Button>
        </div>
      </Container>
    </div>
  );
}
