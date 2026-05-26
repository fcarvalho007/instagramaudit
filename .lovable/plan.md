## Objetivo

Inserir um widget de feedback discreto entre o Bloco 1 (Visão geral) e o Bloco 2 (Diagnóstico) no relatório `/analyze/$username`, aproveitando a fase beta para recolher uma reação de 1 clique.

## UX

Pequena secção centrada, fundo `surface-base`, sem card pesado:

```
                  COMO FOI O BLOCO 1?
              😔   😕   😐   🙂   😍
                        Bom
   Estamos em beta. O teu clique ajuda-nos a afinar o relatório.
```

- Eyebrow: `COMO FOI ATÉ AQUI?` (Inter uppercase, `.text-eyebrow-sm`).
- 5 emojis com hover/scale subtle, transição grayscale → cor no hover.
- Label dinâmico (Péssimo / Mau / Razoável / Bom / Excelente) em pt-PT, Inter SemiBold ~text-base.
- Linha de microcopy beta sob o widget.
- Após clique: animação fade → mensagem "Obrigado. Feedback registado." + opcional `textarea` minimal ("Queres acrescentar algo? (opcional)") com botão "Enviar". O botão fica `ghost` e enviar é opcional — clicar fora basta.
- Bloqueio anti-duplo-voto: `localStorage` key `inline-fb:{handle}:{snapshot_id}` (ou só `{handle}` quando snapshot não existe). Se já votou, widget aparece colapsado: "Já registaste o teu feedback. Obrigado." (sem CTA).

Tokens semânticos apenas (`content-primary`, `content-secondary`, `surface-muted`, `border-default`). **Sem `slate-*`, sem `red-*`/`orange-*` hard-coded** — as cores no snippet do utilizador violariam a memória do projeto; uso os accents do design system (signal-success/warning/danger já existentes) para o gradiente subtle no emoji ativo, sem gradientes berrantes.

## Inserção

Ficheiro `src/components/report-redesign/v2/report-shell-v2.tsx`, em **2 sítios** (gated e non-gated), entre `ReportOverviewBlock` e `ReportDiagnosticBlock`:

```tsx
{features.blockDiagnosis !== "hidden" && (
  <BlockFeedback
    handle={result.data.profile.username}
    snapshotId={result.data.snapshot?.id ?? null}
    block="overview"
  />
)}
```

## Componente

Novo: `src/components/report-redesign/v2/feedback/block-feedback.tsx`

- Client-side, sem SSR.
- Estado: `idle | submitting | done | error`.
- POST para `/api/public/inline-feedback` com `{ handle, snapshot_id, block, rating, comment? }`.
- Em erro: silencioso (mostra "Não foi possível registar. Tenta mais tarde.") — não bloqueia leitura do relatório.
- i18n: chaves novas em `src/i18n/locales/pt/report.json` namespace `feedback.inline.*` (mesmo padrão dos restantes textos do report).

## Backend

### Migration: tabela `inline_report_feedback`

```sql
create table public.inline_report_feedback (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  snapshot_id uuid,
  block text not null check (block in ('overview','diagnostic','performance','content')),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

alter table public.inline_report_feedback enable row level security;

-- No SELECT policy (apenas service role lê via admin futuro).
-- INSERT é feito server-side via supabaseAdmin no /api/public — RLS bloqueia o resto.
create index idx_inline_fb_handle on public.inline_report_feedback(handle, created_at desc);
create index idx_inline_fb_snapshot on public.inline_report_feedback(snapshot_id) where snapshot_id is not null;
```

Sem políticas para anon → escrita é exclusivamente via endpoint server-side com `supabaseAdmin` (bypassa RLS).

### Endpoint: `src/routes/api/public/inline-feedback.ts`

- POST handler.
- Validação Zod: `handle` (1..255, `^[a-zA-Z0-9._-]+$`), `snapshot_id` UUID opcional, `block` enum, `rating` 1..5, `comment` ≤ 500 chars opcional.
- Rate-limit leve: hash do IP + handle, max 5 inserts/hora (consulta `count` na tabela com janela). Em excesso devolve 200 vazio (não revela bloqueio).
- Grava `user_agent` truncado e `ip_hash` (`sha256(ip + DAILY_SALT)`).
- Resposta `{ ok: true }`.

## Fora do âmbito

- Não tocar em `beta_feedback` (é outra coisa: lead-gated, tied a `report_request_id`).
- Sem login, sem email — alinha com "private/admin testing, no email gate".
- Sem dashboard admin agora — fica preparado para um futuro `/admin/feedback`.
- Não emitir emails, não tocar em Brevo/Resend.

## Ficheiros

**Novos**
- `supabase/migrations/<ts>_inline_report_feedback.sql`
- `src/routes/api/public/inline-feedback.ts`
- `src/components/report-redesign/v2/feedback/block-feedback.tsx`

**Editados**
- `src/components/report-redesign/v2/report-shell-v2.tsx` (2 inserções)
- `src/i18n/locales/pt/report.json` (chaves `feedback.inline.*`)

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Preview `/analyze/robs.cortez`: ver widget entre blocos; clicar 🙂; recarregar página → widget aparece em estado "já registado"; confirmar 1 linha em `inline_report_feedback`.

## Confirmação antes de avançar

A tabela `inline_report_feedback` é nova e não toca em nada existente. Confirmas que avanço com a migration + componente + endpoint?