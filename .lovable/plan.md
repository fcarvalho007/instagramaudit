# Ligar botão "Pedir versão PDF" ao endpoint público

## Contexto

O endpoint `POST /api/public/public-report-pdf` está pronto, alinhado com a spec final (TTL 600s, path `reports/snapshots/YYYY/MM/{id}.pdf`, resposta com `cached`). Falta o último passo: **ligar o botão** que hoje está desativado com a etiqueta "Em breve" em `src/components/report-share/report-share-actions.tsx`.

O `snapshotId` já está disponível na página `/analyze/$username` (linha 143 do route file) — só não está a ser passado ao componente de partilha.

## Alterações

### 1. `src/components/report-share/share-copy.ts`
- Remover `note: "Em breve"` da entrada `pdf`.
- Adicionar copy para os três estados do botão: idle, loading e error.
- Adicionar mensagens de toast: sucesso (com indicação se veio de cache) e erro.

### 2. `src/components/report-share/report-share-actions.tsx`
- Aceitar nova prop opcional `snapshotId?: string`.
- Manter o botão **desativado** se `snapshotId` não vier (fallback seguro — nunca chamar o endpoint sem ID).
- Quando `snapshotId` existir:
  - Estado local `pdfStatus: "idle" | "loading" | "error"`.
  - `onClick` faz `POST /api/public/public-report-pdf` com `{ snapshot_id }`.
  - Em sucesso: abrir `signed_url` em nova janela (`window.open(url, "_blank", "noopener,noreferrer")`) e mostrar toast (texto distinto se `cached === true`).
  - Em erro (HTTP ≠ 2xx ou JSON inválido): toast de erro e voltar a `idle`.
- Substituir o ícone por um spinner (`Loader2` da lucide-react com `animate-spin`) durante `loading`.
- Manter o desenho actual (pill, border-subtle, etc.) — apenas cor/cursor activos quando habilitado.

### 3. `src/routes/analyze.$username.tsx`
- Passar `snapshotId={state.snapshotId}` aos dois usos de `<ReportShareActions … />` (variants `compact` e `default`).

## Comportamento final

- Botão visível desde o primeiro render mas **só clicável** quando o snapshot terminou de carregar.
- Click → POST → abre o signed URL numa nova aba. PDFs subsequentes para o mesmo snapshot são instantâneos (cache hit).
- Sem alterações no fluxo email-gated (`request-full-report` / `generate-report-pdf`).
- Sem novas dependências, sem alterações em ficheiros locked, sem chamadas a Apify/DataForSEO/OpenAI.

## Notas técnicas

- O endpoint já valida o UUID e devolve `{ success, snapshot_id, pdf_status, signed_url, expires_in: 600, cached }`. O cliente só precisa de ler `signed_url` e `cached`.
- Tratamento de erros mantém-se simples: qualquer falha → toast genérico, sem expor detalhes técnicos ao utilizador.
- Acessibilidade: `aria-busy` no botão durante `loading`; `aria-disabled` quando sem `snapshotId`.

## Validação

- `bunx tsc --noEmit`
- Smoke manual: abrir `/analyze/<username>`, esperar relatório, clicar "Pedir versão PDF", confirmar abertura do PDF numa nova aba.
- Segundo clique deve ser visivelmente mais rápido (cache hit) e o toast indicar isso.

## Checkpoint

- ☐ Copy `share-copy.ts` actualizada (sem "Em breve", com estados)
- ☐ `ReportShareActions` recebe `snapshotId` e chama o endpoint
- ☐ Estados loading/erro/sucesso visíveis
- ☐ Signed URL abre em nova aba
- ☐ Toast diferenciado para cache hit vs render
- ☐ `analyze.$username.tsx` passa `snapshotId` em ambos os usos
- ☐ Fluxo email-gated intocado
- ☐ `bunx tsc --noEmit` passa
