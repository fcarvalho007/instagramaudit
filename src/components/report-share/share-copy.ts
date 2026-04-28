export const SHARE_COPY = {
  eyebrow: "Partilhar relatório",
  description:
    "Envia este relatório a quem precise de o ler. O link é público durante a fase beta.",
  actions: {
    copy: { label: "Copiar link", labelDone: "Link copiado" },
    linkedin: { label: "Partilhar no LinkedIn" },
    pdf: { label: "Pedir versão PDF", note: "Em breve" },
  },
  toast: {
    success: "Link copiado para a área de transferência.",
    error: "Não foi possível copiar o link. Copia manualmente da barra do navegador.",
  },
} as const;
