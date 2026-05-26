import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { FeedbackForm } from "@/components/feedback/feedback-form";

export const Route = createFileRoute("/feedback/$requestId")({
  head: () => ({
    meta: [
      { title: "Feedback · AuditProfiles" },
      {
        name: "description",
        content: "Partilha o teu feedback sobre o relatório AuditProfiles.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FeedbackPage,
});

type LoadState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "ready"; leadFirstName: string | null; handle: string }
  | { status: "already_submitted"; leadFirstName: string | null }
  | { status: "submitted" };

function FeedbackPage() {
  const { requestId } = Route.useParams();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/feedback/${requestId}`, {
          method: "GET",
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          leadFirstName?: string | null;
          handle?: string;
          alreadySubmitted?: boolean;
        };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setState({ status: "invalid" });
          return;
        }
        if (data.alreadySubmitted) {
          setState({
            status: "already_submitted",
            leadFirstName: data.leadFirstName ?? null,
          });
          return;
        }
        setState({
          status: "ready",
          leadFirstName: data.leadFirstName ?? null,
          handle: data.handle ?? "",
        });
      } catch {
        if (!cancelled) setState({ status: "invalid" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  return (
    <Container className="py-12 sm:py-16 max-w-xl">
      {state.status === "loading" ? (
        <div className="flex flex-col items-center gap-3 py-16 text-content-secondary">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">A carregar…</p>
        </div>
      ) : null}

      {state.status === "invalid" ? (
        <div className="text-center space-y-4 py-12">
          <div className="flex justify-center">
            <div className="rounded-full bg-signal-negative/10 p-4">
              <AlertCircle className="h-8 w-8 text-signal-negative" />
            </div>
          </div>
          <h1 className="font-display text-2xl text-content-primary">
            Link inválido ou expirado
          </h1>
          <p className="text-sm text-content-secondary">
            Não conseguimos identificar este pedido. Verifica o link no email
            ou contacta-nos se o problema persistir.
          </p>
          <Link to="/">
            <Button variant="secondary">Voltar ao início</Button>
          </Link>
        </div>
      ) : null}

      {state.status === "already_submitted" ? (
        <div className="text-center space-y-4 py-12">
          <div className="flex justify-center">
            <div className="rounded-full bg-signal-positive/10 p-4">
              <CheckCircle className="h-8 w-8 text-signal-positive" />
            </div>
          </div>
          <h1 className="font-display text-2xl text-content-primary">
            Já recebemos o teu feedback
          </h1>
          <p className="text-sm text-content-secondary">
            {state.leadFirstName
              ? `Obrigado, ${state.leadFirstName}. `
              : "Obrigado. "}
            Vamos usá-lo para melhorar o AuditProfiles.
          </p>
          <Link to="/">
            <Button variant="secondary">Voltar ao início</Button>
          </Link>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <FeedbackForm
          requestId={requestId}
          leadFirstName={state.leadFirstName}
          handle={state.handle}
          onSubmitted={() => setState({ status: "submitted" })}
        />
      ) : null}

      {state.status === "submitted" ? (
        <div className="text-center space-y-4 py-12">
          <div className="flex justify-center">
            <div className="rounded-full bg-signal-positive/10 p-4">
              <CheckCircle className="h-8 w-8 text-signal-positive" />
            </div>
          </div>
          <h1 className="font-display text-2xl text-content-primary">
            Feedback enviado
          </h1>
          <p className="text-sm text-content-secondary">
            Obrigado pelo teu tempo. Vamos analisar a tua resposta nos próximos dias.
          </p>
          <Link to="/">
            <Button variant="secondary">Voltar ao início</Button>
          </Link>
        </div>
      ) : null}
    </Container>
  );
}