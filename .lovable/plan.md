
## Auditoria rápida (o que se passa)

### 1. Avatar do perfil no hero não aparece
**Existe** em `report-hero-v2.tsx:264-326` (`Avatar` component). Bug:
```ts
onError={(e) => { e.currentTarget.style.display = "none" }}
```
Quando o proxy `/api/public/ig-thumb` falha (URL Instagram CDN assinado expira em horas/dias), a imagem é simplesmente escondida — **sem fallback** para as iniciais. Resultado: espaço vazio ao lado do handle.

Causa raiz provável: o avatarUrl guardado no snapshot é um URL CDN do Instagram com assinatura temporária. Quando o relatório é re-renderizado dias depois, a assinatura já expirou → 403 do proxy.

### 2. Thumbnails do card "Formato" não aparecem
Os thumbnails já são proxied (`snapshot-to-report-data.ts:1467`: `thumbnail_url` envolvido em `/api/public/ig-thumb?url=...`). **Mesmo problema do avatar**: URLs do Instagram são assinados e curto prazo. Quando expiram, `PostThumb.onError` cai para o ícone genérico (linha 411). É **comportamento esperado mas a UX é fraca** — 12 ícones placeholder cinzentos.

### 3. Card "Frequência de publicação" — duplicação
**"Pico semanal"** (KPI strip, linha 397-413) e **"Mais ativo"** (WeeklySummary, linha 202-232) mostram exactamente a mesma informação (`pickMostActive(buckets).weekday`). Decisão: **manter o Pico semanal no KPI strip** (mais visível, melhor enquadrado) e **remover só o "Mais ativo"** do `WeeklySummary`, deixando só o **"Mais parado"** com um enquadramento mais editorial.

### 4. Calendário "Quando publicou" vs janela analisada
Verifiquei o código (linhas 484-508 de `frequency-card.tsx`):
- A análise é mesmo de **30 dias** (`cadenceWindowDays = 30`).
- `windowedDays = calendarDays.slice(-30)` → tem 30 entradas.
- `buildWeekGrid` (linha 424) gera ~5 semanas × 7 colunas com padding inicial.

Na captura aparecem **apenas 2 semanas (~14 células)** porque `calendarDays` vindo do snapshot pode estar a vir já clipped à actividade real (não aos 30 dias). É um bug de dados, não de UI — o calendário promete 30 dias e mostra ~14.

---

## Plano de mudanças (apenas frontend + uma pequena correcção de dados no transformador)

### A. Fix avatar fallback (`report-hero-v2.tsx`)
- Trocar o `onError` que faz `display: none` por um estado `failed` (como já existe no `PostThumb`) e renderizar o bloco de iniciais (`fullName.split(...).map(p=>p[0])`) quando falha.
- Mantém UX consistente mesmo quando o URL CDN do Instagram expira.

### B. Fix thumbnails do format card (`format-card.tsx` + `snapshot-to-report-data.ts`)
- **Não tentar revalidar URLs expirados em runtime** — fora do escopo (cache do Apify).
- Melhorar o fallback do `PostThumb` (linha 408-422): em vez do ícone `<Image>` minúsculo cinzento, mostrar um **placeholder com gradiente subtil + ícone do formato** (Reels / Carrossel / Imagem) — mantém o ritmo visual da grelha sem parecer "broken".
- Substituir `text-slate-400` (proibido por design tokens) por `text-content-tertiary`.

### C. Card "Frequência de publicação" — remover duplicação
- Em `WeeklySummary` (linha 181-316): **remover o bloco "Mais ativo"** (linhas 202-232) — fica só "Mais parado" + as mini-bars S-T-Q-Q-S-S-D.
- Ajustar o grid: passa a ser sempre `grid-cols-1` (sem `sm:grid-cols-2`).
- Renomear o título de `frequency.weekly_summary.title` ("Resumo da semana") para algo mais focado: **"Dias sem publicação"** ou **"Onde o ritmo falha"** (i18n pt + en).

### D. Calendário "Quando publicou" — garantir 30 dias + toggle colapsar
1. **Garantir 30 dias completos**: na `buildWeekGrid` (linha 424), preencher também à direita (padding final) para que `windowedDays.length === 30` resulte sempre em ≥4 linhas completas — mostrar exactamente a janela prometida.
2. **Toggle colapsável**: adicionar botão "Ver dias exactos" / "Esconder" (sentence case, design system) que mostra/esconde o bloco do calendário + legenda. Default = **colapsado** (mais limpo, KPIs e WeeklySummary já dão a leitura macro). Usar `useState` local, `aria-expanded`.
3. Adicionar pequeno texto sob o título a confirmar a janela: "Últimos 30 dias · 12 publicações".

### Ficheiros tocados
- `src/components/report-redesign/v2/report-hero-v2.tsx` — fallback do avatar
- `src/components/report-redesign/v2/overview/format-card.tsx` — fallback dos thumbs
- `src/components/report-redesign/v2/overview/frequency-card.tsx` — remover "Mais ativo", toggle calendário, padding final
- `src/i18n/locales/pt/report.json` + `en/report.json` — novas chaves: `weekly_summary.title` (renomear), `calendar.toggle_show`, `calendar.toggle_hide`, `calendar.window_summary`

### Validação
- `bunx tsc --noEmit`
- Preview 1460×905 e 411×742 — confirmar avatar fallback (testar URL inválido), thumbnails fallback, calendário colapsado por defeito, sem duplicação no card de frequência.

### Fora de escopo
- Re-validação de URLs do Instagram (problema do Apify/CDN, fora do frontend)
- Outros blocos, sidebar, `/report.example`, dark mode, admin
- Investigar/alterar o pipeline de snapshot (`snapshot-to-report-data.ts`) para além do fallback dos thumbs

---

## ☐ Checkpoint
- [ ] Avatar: fallback com iniciais quando img falha
- [ ] Thumbnails: placeholder melhor (gradiente + ícone do formato, sem `slate-*`)
- [ ] Frequência: remover "Mais ativo" do WeeklySummary, manter só "Mais parado"
- [ ] Calendário: garantir 30 células completas + toggle colapsar (default colapsado)
- [ ] i18n: chaves novas pt/en
- [ ] `bunx tsc --noEmit` passa
- [ ] Screenshots desktop + mobile confirmam
