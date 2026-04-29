# Plano · Exportar PDF e Partilhar do Relatório

Dois problemas distintos no bloco final de `/analyze/$username`. Trato cada um numa secção.

---

## a) "Exportar PDF" abre aba vazia

### Diagnóstico

O endpoint `/api/public/public-report-pdf` está completo e funcional (carrega snapshot → `renderReportPdf` → upload no bucket `report-pdfs` → devolve `signed_url` válido por 600s). Logo, o PDF **é gerado**.

O problema está no fluxo de abertura no cliente (`use-report-share-actions.ts` + `report-final-block.tsx`):

1. Ao clicar, abrimos sincronamente `window.open("about:blank", "_blank")` para sobreviver a popup blockers.
2. Aguardamos o `fetch` (pode demorar 5–20s a renderizar a primeira vez).
3. Quando a resposta chega, fazemos `popup.location.href = signedUrl`.

O navegador do utilizador (Chrome/Brave/Safari modernos) trata uma `about:blank` aberta sem user-gesture imediato e que demora >N segundos a navegar como popup suspeito → fecha-a ou bloqueia a navegação. Daí o toast "PDF pronto, mas o navegador bloqueou a nova aba" e a aba aparecer **vazia**.

A "fallback link" funciona porque o clique no link é, ele próprio, um novo user-gesture limpo.

### Correção

Mudar a estratégia de entrega do PDF para **não depender de popup pré-aberto**:

1. **Eliminar `window.open("about:blank")` antecipado.**
2. Depois do `fetch` devolver `signed_url`, criar um `<a href={signedUrl} download="...pdf" target="_blank" rel="noopener">` em memória, anexá-lo ao DOM e disparar `.click()` programaticamente. O navegador trata isto como download/abertura iniciada pelo gesto original do clique no botão, mesmo após `await`, porque o handler ainda está na mesma tarefa de evento (em Chrome/Edge funciona; no Safari força download).
3. Em paralelo, **pré-gerar o PDF em background** quando o snapshot fica pronto (chamada `fetch` opcional após o report montar). Assim, no segundo clique do utilizador, o endpoint devolve `cached: true` em <500ms e a navegação é instantânea.
4. Manter o botão "Abrir PDF numa nova aba" como fallback visível **sempre** (não só quando o popup é bloqueado), porque permite ao utilizador re-clicar caso o navegador tenha intercept.
5. Renomear o toast bloqueado para algo construtivo ("PDF pronto. Abre na nova aba ou usa o botão abaixo.") em vez de mensagem de erro.

### Verificação

- Abrir `/analyze/<user>` em Chrome incógnito (popup blocker activo) e Safari.
- Confirmar que, ao clicar "Exportar PDF", o PDF abre numa nova aba **com o conteúdo**.
- Em segundo clique, deve ser instantâneo (cache).

---

## b) Partilhar muito básico — adicionar menu de canais com teaser

### Diagnóstico

Hoje:
- Botão "Copiar link" no hero → só copia URL.
- Bloco final tem "Copiar link" + "Partilhar no LinkedIn" como links separados.
- Não há WhatsApp, email, nem texto de teaser.

### Solução

Criar um **popover de partilha** unificado, accionado pelo botão "Partilhar" no hero e por um botão "Partilhar relatório" no bloco final.

#### Estrutura do popover

```text
┌─ Partilhar este relatório ──────────────┐
│ "Análise de @handle: 4.2% engagement,   │
│  acima da mediana do setor (top 30%)."  │
│  [editar mensagem ▾]                    │
│ ─────────────────────────────────────── │
│ [WhatsApp] [LinkedIn] [Email] [Copiar]  │
└─────────────────────────────────────────┘
```

#### Teaser dinâmico (pt-PT, determinístico)

Construído a partir de `result.data.keyMetrics` e `result.data.benchmark.positioning`:

- **Engagement**: `engagementRate` formatado a 2 casas + comparação `engagementDeltaPct` ("acima/abaixo da mediana do setor").
- **Posicionamento**: `positioning.tierLabel` quando `status === "available"` (ex: "top 30%", "mediana", "top 10%").
- **Cadência**: `estimated_posts_per_week` se relevante.

Exemplos:

- "Análise pública de @frederico.m.carvalho: 4.2% engagement (top 30% do setor) e 3 posts/semana. Vê o relatório completo:"
- "Análise pública de @marca: 1.8% engagement, abaixo da mediana do setor. Diagnóstico completo:"

Texto fica num helper puro `buildShareMessage(result)` em `src/components/report-share/share-message.ts` para ser testável e reutilizado pelos 4 canais.

#### Canais e URLs

| Canal | URL |
|---|---|
| WhatsApp | `https://wa.me/?text=${encodeURIComponent(message + " " + url)}` |
| LinkedIn | `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` (LinkedIn ignora texto custom; o teaser fica em OG meta) |
| Email | `mailto:?subject=...&body=${encodeURIComponent(message + "\n\n" + url)}` |
| Copiar | escreve `message + "\n" + url` no clipboard |

Cada canal abre via `<a href>` (gesto limpo, sem `window.open`). LinkedIn vai depender dos OG tags do `/analyze/$username` — o head() actual já tem og:title e og:description; ficam suficientes na fase beta.

#### Componentes

- **Novo**: `src/components/report-share/share-popover.tsx` — usa `Popover` do shadcn (já no projeto), 4 botões com ícones (`MessageCircle` para WhatsApp, `Linkedin`, `Mail`, `Link2`), bloco com a mensagem e indicador "Copiado ✓" inline.
- **Novo**: `src/components/report-share/share-message.ts` — helper puro `buildShareMessage({ result, url })`.
- **Editar**: `src/components/report-redesign/report-hero.tsx` — substituir o botão "Copiar" actual por trigger do popover.
- **Editar**: `src/components/report-share/report-final-block.tsx` — substituir os dois botões de copy/LinkedIn pelo mesmo popover (passar `result` por prop nova).
- **Editar**: `src/components/report-redesign/report-shell.tsx` — passar `result` ao `ReportFinalBlock`.
- **Editar**: `src/components/report-share/share-copy.ts` — adicionar copy pt-PT para os novos canais e o cabeçalho do popover.

#### Acessibilidade

- Popover com `aria-label="Partilhar relatório"`, focus trap nativo do Radix.
- Cada canal é um `<a>` semântico (não `button`) → funciona com middle-click e "abrir em nova aba".
- Mensagem de teaser visível e seleccionável (utilizador pode copiar manualmente partes).

---

## Fora do âmbito

- Não tocar em `/report/example`.
- Não mudar `src/lib/pdf/*` (o PDF em si está correcto).
- Não tocar no endpoint `/api/public/public-report-pdf`.
- Não criar dependências novas (usar `Popover` shadcn já instalado e ícones de `lucide-react`).
- Não tocar em ficheiros em `LOCKED_FILES.md`.

## Validação

- `bunx tsc --noEmit`.
- QA manual em Chrome desktop, Safari iOS e Android Chrome:
  - PDF abre com conteúdo no 1º clique.
  - Popover de partilha mostra mensagem dinâmica correcta.
  - WhatsApp abre app/web com texto + URL.
  - Email abre cliente com subject + body.
  - LinkedIn abre share dialog.
  - Copiar coloca `mensagem + URL` no clipboard.

## Checklist

- ☐ Reescrever fluxo de abertura do PDF (sem `window.open` antecipado, com `<a download>` programático após resposta).
- ☐ Pré-fetch opcional do PDF após o snapshot carregar (warm cache).
- ☐ Criar `share-message.ts` (helper puro pt-PT).
- ☐ Criar `share-popover.tsx` com 4 canais.
- ☐ Integrar popover no `report-hero.tsx` e `report-final-block.tsx`.
- ☐ Passar `result` ao `ReportFinalBlock` via `report-shell.tsx`.
- ☐ Atualizar `share-copy.ts`.
- ☐ `bunx tsc --noEmit` verde.
- ☐ QA manual nos 3 navegadores.
