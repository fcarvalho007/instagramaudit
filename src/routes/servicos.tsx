import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ServicesPage } from "@/components/services/services-page";

const searchSchema = z
  .object({
    topico: z.enum(["auditoria", "formacao", "agencia", "outro"]).optional(),
  })
  .strip();

export const Route = createFileRoute("/servicos")({
  validateSearch: (raw) => searchSchema.parse(raw),
  head: () => ({
    meta: [
      { title: "Serviços — AuditProfiles" },
      {
        name: "description",
        content:
          "Auditoria de Autoridade Digital e formação em redes sociais e IA para marcas e equipas. Sob consulta.",
      },
      { property: "og:title", content: "Serviços — AuditProfiles" },
      {
        property: "og:description",
        content:
          "Auditoria de Autoridade Digital e formação em redes sociais e IA. Sob consulta.",
      },
      { property: "og:url", content: "https://auditprofiles.com/servicos" },
    ],
    links: [
      { rel: "canonical", href: "https://auditprofiles.com/servicos" },
    ],
  }),
  component: ServicesPage,
});