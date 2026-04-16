import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ backgroundColor: "rgb(var(--surface-base))" }}
    >
      <div className="flex flex-col items-center space-y-6 text-center">
        <p
          className="font-mono text-xs uppercase"
          style={{
            letterSpacing: "var(--tracking-wide)",
            color: "rgb(var(--text-tertiary))",
          }}
        >
          Sprint 0 · Foundation
        </p>

        <h1
          className="font-display text-4xl font-semibold md:text-5xl"
          style={{
            letterSpacing: "var(--tracking-tight)",
            color: "rgb(var(--text-primary))",
            lineHeight: "var(--leading-tight)",
          }}
        >
          Design system em construção
        </h1>

        <p
          className="max-w-lg text-lg"
          style={{
            color: "rgb(var(--text-secondary))",
            lineHeight: "var(--leading-normal)",
          }}
        >
          Esta é a base tipográfica e cromática do Instagram Benchmark Analyzer.
          Se estás a ler isto com tipografia editorial em fundo navy com acento
          cyan — a fundação está pronta.
        </p>

        <div className="flex items-center gap-2 pt-4">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              backgroundColor: "rgb(var(--accent-primary))",
              boxShadow: "var(--shadow-glow-cyan)",
            }}
          />
          <span
            className="font-mono text-xs uppercase"
            style={{
              letterSpacing: "var(--tracking-wide)",
              color: "rgb(var(--text-tertiary))",
            }}
          >
            tokens.css carregado
          </span>
        </div>
      </div>
    </div>
  );
}
