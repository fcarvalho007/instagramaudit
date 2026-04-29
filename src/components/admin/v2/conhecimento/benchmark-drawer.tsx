/**
 * BenchmarkDrawer — formulário de criação/edição de benchmark + histórico.
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFetch } from "@/lib/admin/fetch";
import {
  FORMAT_LABEL,
  TIER_LABEL,
  type BenchmarkFormat,
  type BenchmarkTier,
  type KnowledgeBenchmark,
  type KnowledgeHistoryEntry,
  type KnowledgeSource,
} from "@/lib/knowledge/types";

interface Props {
  open: boolean;
  onClose: () => void;
  tier: BenchmarkTier;
  format: BenchmarkFormat;
  benchmark: KnowledgeBenchmark | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function BenchmarkDrawer({ open, onClose, tier, format, benchmark }: Props) {
  const qc = useQueryClient();
  const [engagement, setEngagement] = useState("");
  const [sample, setSample] = useState("");
  const [sourceId, setSourceId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [validFrom, setValidFrom] = useState(todayISO());

  useEffect(() => {
    if (!open) return;
    setEngagement(benchmark ? String(benchmark.engagement_pct) : "");
    setSample(benchmark ? String(benchmark.sample_size) : "");
    setSourceId(benchmark?.source_id ?? "none");
    setNotes(benchmark?.notes ?? "");
    setValidFrom(benchmark?.valid_from ?? todayISO());
  }, [open, benchmark]);

  const sourcesQuery = useQuery({
    queryKey: ["admin", "knowledge", "sources"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/knowledge/sources");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as KnowledgeSource[];
    },
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const historyQuery = useQuery({
    queryKey: ["admin", "knowledge", "history", "benchmark", benchmark?.id ?? "new"],
    queryFn: async () => {
      if (!benchmark?.id) return [] as KnowledgeHistoryEntry[];
      const res = await adminFetch(
        `/api/admin/knowledge/history/benchmark/${benchmark.id}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as KnowledgeHistoryEntry[];
    },
    enabled: open && Boolean(benchmark?.id),
    refetchOnWindowFocus: false,
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        id: benchmark?.id,
        tier,
        format,
        engagement_pct: Number(engagement),
        sample_size: Number(sample),
        source_id: sourceId === "none" ? null : sourceId,
        notes: notes.trim() || null,
        valid_from: validFrom,
      };
      const res = await adminFetch("/api/admin/knowledge/benchmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      toast.success("Benchmark guardado.");
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro a guardar"),
  });

  const archive = useMutation({
    mutationFn: async () => {
      if (!benchmark?.id) return;
      const res = await adminFetch(
        `/api/admin/knowledge/benchmarks/${benchmark.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => {
      toast.success("Benchmark arquivado.");
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erro"),
  });

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Benchmark · {TIER_LABEL[tier]} · {FORMAT_LABEL[format]}
          </SheetTitle>
          <SheetDescription>
            {benchmark
              ? "Atualizar valor de referência. Cada alteração fica registada no histórico."
              : "Adicionar novo benchmark. Origem ficará marcada como manual."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="eng">Engagement %</Label>
              <Input
                id="eng"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={engagement}
                onChange={(e) => setEngagement(e.target.value)}
                placeholder="2.45"
              />
            </div>
            <div>
              <Label htmlFor="sample">Tamanho da amostra</Label>
              <Input
                id="sample"
                type="number"
                min="1"
                value={sample}
                onChange={(e) => setSample(e.target.value)}
                placeholder="1500"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="source">Fonte</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger id="source">
                <SelectValue placeholder="Selecionar fonte (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem fonte específica</SelectItem>
                {(sourcesQuery.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="from">Vigente a partir de</Label>
            <Input
              id="from"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas editoriais</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexto, metodologia, ressalvas…"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {benchmark?.id ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => archive.mutate()}
                  disabled={archive.isPending}
                  className="text-admin-text-tertiary"
                >
                  Arquivar
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => upsert.mutate()}
                disabled={
                  upsert.isPending ||
                  !engagement ||
                  !sample ||
                  Number(engagement) < 0 ||
                  Number(sample) < 1
                }
              >
                {benchmark ? "Guardar alterações" : "Criar benchmark"}
              </Button>
            </div>
          </div>

          {benchmark?.id ? (
            <div className="mt-6 border-t border-admin-border pt-4">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-admin-text-tertiary">
                Histórico
              </h4>
              {historyQuery.isLoading ? (
                <p className="text-[12px] text-admin-text-tertiary">A carregar…</p>
              ) : (historyQuery.data ?? []).length === 0 ? (
                <p className="text-[12px] text-admin-text-tertiary">Sem alterações registadas.</p>
              ) : (
                <ul className="space-y-2">
                  {(historyQuery.data ?? []).map((h) => (
                    <li
                      key={h.id}
                      className="rounded border border-admin-border px-3 py-2 text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-admin-text-primary">
                          {h.action}
                        </span>
                        <span className="text-admin-text-tertiary">
                          {new Date(h.changed_at).toLocaleString("pt-PT")}
                        </span>
                      </div>
                      {h.changed_by_email ? (
                        <div className="text-admin-text-tertiary">
                          {h.changed_by_email}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
