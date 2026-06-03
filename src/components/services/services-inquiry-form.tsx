import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitServicesInquiry } from "@/lib/services/services-inquiry.functions";

type Topic = "auditoria" | "formacao" | "agencia" | "outro";

interface Props {
  defaultTopic?: Topic;
}

export function ServicesInquiryForm({ defaultTopic = "auditoria" }: Props) {
  const submit = useServerFn(submitServicesInquiry);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    topic: defaultTopic as Topic,
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await submit({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim() || undefined,
          topic: form.topic,
          message: form.message.trim(),
        },
      });
      setDone(true);
      toast.success("Pedido enviado. Vamos voltar a contactar.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha a enviar.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-border-default bg-surface-muted p-8 text-center">
        <p className="font-fraunces text-xl text-content-primary">
          Recebido. Obrigado.
        </p>
        <p className="mt-2 text-sm text-content-secondary">
          Vamos analisar o teu pedido e responder em até 2 dias úteis.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-1">
        <Label htmlFor="si-name">Nome</Label>
        <Input
          id="si-name"
          required
          maxLength={120}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="si-email">Email</Label>
        <Input
          id="si-email"
          required
          type="email"
          maxLength={255}
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="si-company">Empresa (opcional)</Label>
        <Input
          id="si-company"
          maxLength={120}
          value={form.company}
          onChange={(e) =>
            setForm((f) => ({ ...f, company: e.target.value }))
          }
        />
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="si-topic">Sobre o quê?</Label>
        <Select
          value={form.topic}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, topic: v as Topic }))
          }
        >
          <SelectTrigger id="si-topic">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auditoria">
              Auditoria de Autoridade Digital
            </SelectItem>
            <SelectItem value="formacao">
              Formação em Redes Sociais e IA
            </SelectItem>
            <SelectItem value="agencia">Pack de agência / múltiplos perfis</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="si-message">Conta-nos um pouco mais</Label>
        <Textarea
          id="si-message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          value={form.message}
          onChange={(e) =>
            setForm((f) => ({ ...f, message: e.target.value }))
          }
          placeholder="Contexto, objetivos, prazos…"
        />
      </div>
      <div className="sm:col-span-2">
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            "Enviar pedido"
          )}
        </Button>
      </div>
    </form>
  );
}