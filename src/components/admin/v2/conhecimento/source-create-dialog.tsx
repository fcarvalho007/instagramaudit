/**
 * SourceCreateDialog — criar uma nova fonte.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { SOURCE_TYPE_LABEL, type SourceType } from "@/lib/knowledge/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TYPES: SourceType[] = ["study", "dataset", "api", "internal"];

export function SourceCreateDialog({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("none");
  const [url, setUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [sampleSize, setSampleSize] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setName(""); setType("none"); setUrl(""); setPublishedAt("");
    setSampleSize(""); setNotes("");
  };

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        type: type === "none" ? null : (type as SourceType),
        url: url.trim() || null,
        published_at: publishedAt || null,
        sample_size: sampleSize ? Number(sampleSize) : null,
        notes: notes.trim() || null,
      };
      const res = await adminFetch("/api/admin/knowledge/sources", {
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
      toast.success("Fonte criada.");
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
      reset();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nova fonte</DialogTitle>
          <DialogDescription>
            Documente o estudo, dataset ou referência que usa para fundamentar a Knowledge Base.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="s-name">Nome</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Iconosquare 2026 Industry Benchmarks" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="s-type">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="s-type"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{SOURCE_TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="s-pub">Publicado em</Label>
              <Input id="s-pub" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="s-url">URL</Label>
            <Input id="s-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <Label htmlFor="s-sample">Tamanho da amostra</Label>
            <Input id="s-sample" type="number" min="1" value={sampleSize} onChange={(e) => setSampleSize(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-notes">Notas</Label>
            <Textarea id="s-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || name.trim().length < 2}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
