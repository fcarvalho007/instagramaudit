/**
 * NoteCreateDialog — criar uma nova nota editorial.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  NOTE_CATEGORY_LABEL,
  type KnowledgeSource,
  type NoteCategory,
} from "@/lib/knowledge/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES: NoteCategory[] = ["trend", "format", "algorithm", "vertical", "tool"];

export function NoteCreateDialog({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<NoteCategory>("trend");
  const [vertical, setVertical] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sourceId, setSourceId] = useState<string>("none");

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

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        category,
        vertical: category === "vertical" ? vertical.trim() || null : null,
        title: title.trim(),
        body: body.trim(),
        source_id: sourceId === "none" ? null : sourceId,
      };
      const res = await adminFetch("/api/admin/knowledge/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      toast.success("Nota criada.");
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
      setTitle(""); setBody(""); setVertical(""); setSourceId("none");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nova nota editorial</DialogTitle>
          <DialogDescription>
            Capture um padrão, tendência ou particularidade que a IA deve considerar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="n-cat">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as NoteCategory)}>
                <SelectTrigger id="n-cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{NOTE_CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {category === "vertical" ? (
              <div>
                <Label htmlFor="n-vert">Vertical</Label>
                <Input id="n-vert" value={vertical} onChange={(e) => setVertical(e.target.value)} placeholder="ex: lifestyle" />
              </div>
            ) : null}
          </div>
          <div>
            <Label htmlFor="n-title">Título</Label>
            <Input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Carrosséis 8-10 slides têm maior alcance" />
          </div>
          <div>
            <Label htmlFor="n-body">Conteúdo</Label>
            <Textarea id="n-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Descreva o padrão, contexto e implicações para a interpretação dos dados…" />
          </div>
          <div>
            <Label htmlFor="n-src">Fonte</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger id="n-src"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem fonte específica</SelectItem>
                {(sourcesQuery.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || title.trim().length < 2 || body.trim().length < 2}
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
