# Audit + correções — `/analyze/$username`

## Diagnóstico

Boa notícia: a **consolidação visual já está feita** num commit anterior. O ficheiro `src/routes/analyze.$username.tsx` já:

- não monta nenhum `ReportShareActions` no topo (a busca por `ReportShareActions` em `src/` só devolve uma menção em comentário JSDoc);
- tem **um único bloco final** — `<ReportFinalBlock>` — com PDF como acção primária e Copy/LinkedIn como secundárias;
- usa um `<ScopeStrip>` único (substituiu o par antigo `TierStrip + BetaStrip`);
- não tem nenhum `href="#"` em todo o `src/` (verificado com `rg`);
- mantém `/report/example` intocado.

A falha real é **runtime**, não estrutural. Há três bugs concretos no `ReportFinalBlock`:

### Causa-raiz 1 — `window.open` bloqueado pelo browser (PDF)

```ts
async function handlePdf() {
  setPdfStatus("loading");
  const res = await fetch("/api/public/public-report-pdf", { ... });   // ← await
  const body = await res.json();
  window.open(body.signed_url, "_blank", "noopener,noreferrer");        // ← bloqueado
}
```

Depois de um `await`, o browser deixa de considerar a chamada como gesto do utilizador e o Chrome/Safari/Firefox bloqueiam o `window.open` em popup. O endpoint responde 200 mas o utilizador não vê o PDF — só o toast. **É esta a queixa "PDF não funciona".**

**Correção:** abrir o PDF na **mesma aba** com `window.location.assign(signed_url)`. O ficheiro tem `Content-Disposition: inline` no bucket privado da Supabase e o utilizador volta com o botão "back". Alternativa equivalente é injectar um `<a download>` clicado programaticamente, mas em mobile abrir na mesma aba é mais previsível. Fica documentado em comentário JSDoc.

### Causa-raiz 2 — `navigator.clipboard` indisponível em contextos não-seguros (Copiar link)

O `try/catch` actual lança no fallback (`throw new Error("clipboard-unavailable")`) e mostra erro. Em iOS Safari embedded views, em http localhost ou em iframes de preview sem permissão, o clipboard API não existe e o utilizador vê só erro.

**Correção:** acrescentar fallback com `document.execCommand("copy")` sobre um `<textarea>` temporário. Funciona em todos os browsers como último recurso e elimina falsos negativos.

### Causa-raiz 3 — LinkedIn intent fica `href="#"` no primeiro paint

Enquanto `resolvedUrl` está vazio (antes do `useEffect` correr), o `linkedinHref` cai para `"#"`. Não é um CTA morto permanente, mas se o utilizador clicar antes da hidratação completar, a página faz scroll para o topo e nada acontece. Em mobile lento isto chega a ser visível.

**Correção:** desactivar visualmente o link (atributo `aria-disabled` + `pointer-events: none` via classe condicional) enquanto `resolvedUrl` não estiver pronto, e remover o `target="_blank"` no estado vazio.

### Não-causas (verificadas)

- **Toaster mounting** — está montado dentro do `ReportThemeWrapper` no estado `ready`. O `toast()` só é chamado a partir de cliques que acontecem depois do mount. OK.
- **`snapshotId` propagação** — passa de `analyze.$username.tsx` (state.snapshotId) directo para o componente. Verificado.
- **Endpoint `/api/public/public-report-pdf`** — devolve `{ success, signed_url, cached }`. Parsing actual está correcto.
- **CORS** — endpoint tem OPTIONS handler e o frontend está na mesma origem, sem problema.

## Mudanças

### Ficheiro único: `src/components/report-share/report-final-block.tsx`

1. **`handlePdf`** — substituir `window.open(...)` por `window.location.assign(signed_url)`. Manter toast de "A abrir…" e o estado de loading.
2. **`handleCopy`** — adicionar fallback `document.execCommand("copy")` antes de cair no `toast.error`.
3. **LinkedIn anchor** — quando `resolvedUrl` vazio: aplicar `pointer-events-none opacity-50` e `tabIndex={-1}`; quando preenchido, comportamento actual.
4. Comentário JSDoc no `handlePdf` a explicar porque é que abre na mesma aba (popup blocking pós-await).

### Sem mudanças noutros ficheiros

- `src/routes/analyze.$username.tsx` — estrutura já correcta, layout já mobile-first (375px), `<Toaster />` já presente.
- `src/routes/api/public/public-report-pdf.ts` — endpoint correcto.
- `LOCKED_FILES.md` — não toca em nada bloqueado.
- `/report/example` — intocado.

## Ordem final das secções (já em vigor, confirmada)

```text
1. ReportEnrichedBio              ← perfil primeiro (mobile rápido)
2. CoverageStrip                  ← cobertura editorial
3. ReportPage                     ← métricas, benchmark, posts
4. ReportEnrichedBenchmarkSource
5. ReportEnrichedTopLinks
6. ReportEnrichedMentions
7. ReportEnrichedCompetitorsCta   ← condicional
8. ReportMarketSignals
9. ScopeStrip                     ← tira única âmbito + beta
10. TierComparisonBlock           ← Free vs Pro
11. ReportFinalBlock              ← BLOCO FINAL ÚNICO: PDF + share + feedback
12. <Toaster />
```

## Validação

- `bunx tsc --noEmit` — corre depois das alterações.
- `bun run build` — corre depois das alterações.
- Smoke manual em `/analyze/frederico.m.carvalho`:
  - Copiar link → toast verde + URL na clipboard (testado em desktop e mobile).
  - LinkedIn → abre nova aba com `linkedin.com/sharing/share-offsite/?url=...`.
  - Pedir versão PDF → estado loading visível, navega para o signed URL na mesma aba, PDF inline.
  - 375px → primeiro scroll mostra header + bio sem necessidade de mais que um swipe.

## Fora deste prompt

- Não chama OpenAI, Apify, DataForSEO.
- Não toca em `/report/example`.
- Não cria nem modifica ficheiros bloqueados.
- Não adiciona nova camada de inteligência (próximo prompt).
