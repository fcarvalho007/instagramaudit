/**
 * /report/print/$snapshotId — rota dedicada que renderiza um snapshot
 * persistido no mesmo `ReportShell` usado por `/analyze/$username`, mas
 * com a chrome (header/footer globais, banner beta, CTAs) escondida via
 * CSS scoped (`body.pdf-print-mode`).
 *
 * É esta URL que o renderer print-to-PDF externo (PDFShift) carrega.
 * Carrega o snapshot por UUID directamente — NÃO chama Apify, DataForSEO
 * ou OpenAI. Quando o relatório está totalmente pintado e os avatares
 * decodificados, marca `[data-pdf-ready]` e expõe `window.pdfReady` para
 * que o provider saiba que pode capturar.
 *
 * `?pdf=1` é redundante (a rota inteira é PDF mode) mas mantemos por
 * consistência com o requisito do prompt.
 */

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ReportShell } from "@/components/report-redesign/report-shell";
import {
  snapshotToReportData,
  type AdapterResult,
  type ReportBenchmarkInput,
  type SnapshotMetadata,
  type SnapshotPayload,
} from "@/lib/report/snapshot-to-report-data";

import "@/styles/pdf-print.css";

export const Route = createFileRoute("/report/print/$snapshotId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Relatório (modo impressão) · InstaBench" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    scripts: [
      // Bootstrapping síncrono que precisa de existir ANTES da chegada do
      // PDFShift renderer:
      //
      //   (1) `data-theme="light"` em `<body>` antes do primeiro paint para
      //       evitar flash dark — defer para DOMContentLoaded porque com
      //       `ssr: false` o script corre antes do parser alcançar `<body>`.
      //
      //   (2) `window.pdfReady` definida JÁ — o PDFShift valida o
      //       wait_for function ao carregar a página e rejeita com 400 se
      //       não existir. Lê de `window.pdfReadyState` que o React
      //       comuta para `true` quando o relatório está realmente pronto.
      //       NOTA: com `ssr: false`, este script NÃO chega ao HTML
      //       inicial. O PDFShift recebe o mesmo bootstrap injectado via
      //       o parâmetro `javascript` do provider (ver pdfshift.server.ts);
      //       este bloco serve para o caso de a rota ser carregada num
      //       browser normal (debug, devtools).
      {
        children:
          `(function(){` +
          `window.pdfReadyState=false;` +
          `window.pdfReady=function(){return window.pdfReadyState===true};` +
          `var f=function(){if(document.body){document.body.setAttribute("data-theme","light")}};` +
          `if(document.body){f()}else{document.addEventListener("DOMContentLoaded",f)}` +
          `})()`,
      },
    ],
  }),
  component: PrintReportPage,
});

interface SnapshotResponse {
  success: boolean;
  snapshot?: {
    id: string;
    instagram_username: string;
    payload: SnapshotPayload;
    meta: SnapshotMetadata;
    created_at: string;
    updated_at: string;
    benchmark?: ReportBenchmarkInput;
  } | null;
  error_code?: string;
  message?: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      result: AdapterResult;
      snapshotId: string;
      payload: SnapshotPayload;
      analyzedAtIso: string | null;
    };

function PrintReportPage() {
  const { snapshotId } = Route.useParams();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  // 1) Activate the print mode immediately so the chrome never paints.
  useEffect(() => {
    document.body.classList.add("pdf-print-mode");
    return () => {
      document.body.classList.remove("pdf-print-mode");
    };
  }, []);

  // 2) Load the snapshot by UUID — no pipeline triggered.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/public/analysis-snapshot/by-id/${encodeURIComponent(snapshotId)}`,
        );
        const body = (await res.json().catch(() => null)) as SnapshotResponse | null;
        if (cancelled) return;
        if (!res.ok || !body?.success || !body.snapshot) {
          setState({
            status: "error",
            message: body?.message ?? "Snapshot não encontrado.",
          });
          return;
        }
        const payload = body.snapshot.payload ?? {};
        const result = snapshotToReportData({
          payload,
          meta: body.snapshot.meta ?? undefined,
          benchmark: body.snapshot.benchmark,
          isAdminPreview: false,
        });
        setState({
          status: "ready",
          result,
          snapshotId: body.snapshot.id,
          payload,
          analyzedAtIso:
            body.snapshot.meta?.generated_at ?? body.snapshot.updated_at ?? null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Falha de ligação.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshotId]);

  if (state.status === "loading") {
    return <div aria-hidden="true" style={{ minHeight: "100vh" }} />;
  }

  if (state.status === "error") {
    // Surface the error visibly so the provider's screenshot doesn't
    // silently capture a blank page (and so we can debug from the PDF).
    return (
      <div
        style={{
          padding: "40px",
          fontFamily: "Inter, sans-serif",
          color: "#0F172A",
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>
          Não foi possível carregar o snapshot
        </h1>
        <p style={{ fontSize: 14, color: "#475569" }}>{state.message}</p>
      </div>
    );
  }

  return (
    <PrintReady
      result={state.result}
      snapshotId={state.snapshotId}
      payload={state.payload}
      analyzedAtIso={state.analyzedAtIso}
    />
  );
}

function PrintReady({
  result,
  snapshotId,
  payload,
  analyzedAtIso,
}: {
  result: AdapterResult;
  snapshotId: string;
  payload: SnapshotPayload;
  analyzedAtIso: string | null;
}) {
  const [ready, setReady] = useState(false);

  // Mark the page as ready only after layout has stabilised:
  //   1. component mount
  //   2. two requestAnimationFrame ticks (allow React to commit + browser to paint)
  //   3. wait for any <img> to finish decoding (avatars, top posts thumbnails)
  useEffect(() => {
    let cancelled = false;

    const decodeAllImages = async () => {
      const imgs = Array.from(document.querySelectorAll("img"));
      await Promise.all(
        imgs.map(async (img) => {
          if (img.complete && img.naturalWidth > 0) return;
          try {
            await img.decode();
          } catch {
            /* ignore broken/expired images — never block the PDF */
          }
        }),
      );
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void decodeAllImages().then(() => {
          // Small additional settle window for chart canvases.
          setTimeout(() => {
            if (!cancelled) setReady(true);
          }, 400);
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Expose the global readiness function PDFShift polls.
  useEffect(() => {
    // The global function itself is installed synchronously by the head
    // script + by PDFShift's `javascript` parameter (see pdfshift.server.ts).
    // React only needs to flip the state flag when the report is actually
    // ready.
    (window as unknown as { pdfReadyState?: boolean }).pdfReadyState = ready;
    return () => {
      try {
        (window as unknown as { pdfReadyState?: boolean }).pdfReadyState =
          false;
      } catch {
        /* noop */
      }
    };
  }, [ready]);

  return (
    <ReportThemeWrapper>
      <div data-pdf-ready={ready ? "true" : undefined}>
        <ReportShell
          result={result}
          snapshotId={snapshotId}
          payload={payload}
          analyzedAtIso={analyzedAtIso}
          actions={{
            onExportPdf: () => undefined,
            onShare: () => undefined,
            pdfBusy: false,
            shareBusy: false,
            pdfDisabled: true,
          }}
        />
      </div>
    </ReportThemeWrapper>
  );
}