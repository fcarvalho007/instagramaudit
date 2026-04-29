export const SHARE_COPY = {
  eyebrow: "Partilhar relatório",
  description:
    "Envia este relatório a quem precise de o ler. O link é público durante a fase beta.",
  actions: {
    copy: { label: "Copiar link", labelDone: "Link copiado" },
    linkedin: { label: "Partilhar no LinkedIn" },
    pdf: {
      label: "Pedir versão PDF",
      labelLoading: "A preparar PDF…",
      labelDisabled: "PDF disponível após análise",
    },
    pdfFallback: {
      label: "Abrir PDF numa nova aba",
      blockedHint:
        "O navegador bloqueou a nova aba. Usa o botão acima para abrir o PDF manualmente.",
    },
  },
  toast: {
    success: "Link copiado para a área de transferência.",
    error: "Não foi possível copiar o link. Copia manualmente da barra do navegador.",
    pdfReady: "PDF pronto. Abre numa nova aba.",
    pdfCached: "PDF carregado da cache. Abre numa nova aba.",
    pdfPopupBlocked: "Se a aba não abriu, usa o botão “Abrir PDF numa nova aba”.",
    pdfErrors: {
      INVALID_PAYLOAD: "Pedido inválido. Recarrega a página e tenta novamente.",
      SNAPSHOT_NOT_FOUND: "Este relatório já não está disponível. Faz nova análise.",
      MALFORMED_SNAPSHOT: "Os dados deste relatório estão incompletos. Faz nova análise.",
      RENDER_FAILED: "Falha ao gerar o PDF. Tenta novamente dentro de instantes.",
      UPLOAD_FAILED: "Falha ao guardar o PDF. Tenta novamente dentro de instantes.",
      SIGN_FAILED: "Falha a assinar o PDF. Tenta novamente dentro de instantes.",
      DEFAULT: "Não foi possível gerar o PDF. Tenta novamente em alguns segundos.",
    },
  },
} as const;
