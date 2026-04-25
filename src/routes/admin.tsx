/**
 * /admin — operational admin v1.
 *
 * - Token gate (validated server-side against INTERNAL_API_TOKEN).
 * - Report request list with filters.
 * - Detail sheet with manual recovery actions.
 *
 * Self-contained layout (no public Header/Footer).
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminGate } from "@/components/admin/admin-gate";
import {
  RequestList,
  type AdminRequestRow,
} from "@/components/admin/request-list";
import { RequestDetailSheet } from "@/components/admin/request-detail-sheet";
import { DiagnosticsPanel } from "@/components/admin/diagnostics-panel";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin · InstaBench" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AdminPage() {
  const [authState, setAuthState] = useState<"checking" | "in" | "out">("checking");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Probe authentication by hitting a protected endpoint.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/report-requests?page=1&pageSize=1")
      .then((res) => {
        if (cancelled) return;
        setAuthState(res.ok ? "in" : "out");
      })
      .catch(() => {
        if (!cancelled) setAuthState("out");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    setAuthState("out");
    setSelectedId(null);
  }

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base text-content-secondary">
        A verificar sessão…
      </div>
    );
  }

  if (authState === "out") {
    return (
      <>
        <AdminGate onAuthenticated={() => setAuthState("in")} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base text-content-primary">
      <header className="border-b border-border-subtle bg-surface-elevated">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
              InstaBench · Admin
            </p>
            <h1 className="font-display text-xl text-content-primary">Backoffice</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Terminar sessão
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Tabs defaultValue="diagnostics" className="space-y-6">
          <TabsList>
            <TabsTrigger value="diagnostics">Diagnóstico</TabsTrigger>
            <TabsTrigger value="requests">Pedidos de relatório</TabsTrigger>
          </TabsList>
          <TabsContent value="diagnostics" className="mt-0">
            <DiagnosticsPanel />
          </TabsContent>
          <TabsContent value="requests" className="mt-0">
            <RequestList
              onSelect={(row: AdminRequestRow) => setSelectedId(row.id)}
              refreshKey={refreshKey}
            />
          </TabsContent>
        </Tabs>
      </main>

      <RequestDetailSheet
        reportRequestId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
      <Toaster />
    </div>
  );
}
