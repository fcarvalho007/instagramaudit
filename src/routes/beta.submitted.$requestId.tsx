import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/beta/submitted/$requestId")({
  head: () => ({
    meta: [
      { title: "Pedido Registado · AuditProfiles" },
      { name: "description", content: "O teu pedido de análise beta foi registado com sucesso." },
    ],
  }),
  component: BetaSubmittedPage,
});

function BetaSubmittedPage() {
  const { requestId } = Route.useParams();
  const shortRef = `BETA-${requestId.slice(0, 6).toUpperCase()}`;

  return (
    <Container className="py-16 sm:py-24">
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-signal-positive/10 p-4">
            <CheckCircle className="h-10 w-10 text-signal-positive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-semibold text-text-primary">
            Pedido registado
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Receberás um email quando o relatório estiver pronto.
            Os relatórios podem demorar até 24h durante a fase beta.
          </p>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-elevated/50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Estado</span>
            <span className="text-accent-primary font-medium">A aguardar revisão</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Referência</span>
            <span className="tabular-nums text-text-secondary text-xs">#{shortRef}</span>
          </div>
        </div>

        <Link to="/">
          <Button variant="secondary" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao início
          </Button>
        </Link>
      </div>
    </Container>
  );
}