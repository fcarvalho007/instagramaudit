## Objetivo

Refinar apenas o cabeçalho do cartão da sidebar de relatório (`ProfileHeader` em `src/components/report-redesign/v2/report-block-nav.tsx`) para corresponder ao mockup, e preparar o componente para receber 1..N perfis (futuro comparador) sem refazer mais tarde.

Fora de âmbito: barra de progresso, "Disponível agora", bloco Premium, CTA, mobile tabs, tracking, lógica de acesso. Não mexer.

## Mudanças

### 1. Cabeçalho do cartão (visual, conforme mockup)

Em `ProfileHeader`:

- Adicionar eyebrow `ANÁLISE DE PERFIL` por cima do handle: `text-eyebrow-sm text-content-tertiary` (já existe esta classe no projeto). Vem de i18n.
- Handle mantém-se a uma linha com `truncate`; garantir `min-w-0` no wrapper para qualquer handle longo cortar com reticências (já está, validar).
- Avatar com anel subtil duplo: substituir `ring-1 ring-border-default` por `ring-1 ring-border-default ring-offset-2 ring-offset-white` no `<img>`, e aplicar o mesmo no fallback de iniciais (atualmente não tem ring). Resultado: dois traços finos a separar do fundo branco.
- Layout passa de uma linha (avatar + handle) para coluna no lado direito: avatar à esquerda, eyebrow + handle empilhados à direita. Espaçamento idêntico ao mockup (`gap-3`, `pb-3 mb-3 border-b border-border-default/60` mantém-se).

### 2. Preparar para múltiplos perfis (estrutural, sem UI nova)

- Atualizar `SidebarProps` para aceitar `profile` (singular, atual) **ou** `profiles` (array). Internamente normalizar sempre para `profiles: SidebarProfile[]`.
- `ProfileHeader` passa a receber `profiles: SidebarProfile[]`.
- Comportamento atual (1 perfil): renderiza eyebrow `ANÁLISE DE PERFIL` + handle único. Igual ao mockup.
- Quando `profiles.length > 1` (não ativado já, mas suportado):
  - eyebrow vira `A COMPARAR {n} PERFIS`
  - em vez do handle único, render de avatares sobrepostos (stacked, `-ml-2` com `ring-2 ring-white`) e handles só em `title`/`aria-label` (revelados via tooltip nativo). Sem CSS novo de hover por agora — só o markup pronto.
- Mantém-se compatibilidade total: callers existentes (`report-shell-v2.tsx`, `ReportBlockTopTabs`) continuam a passar `profile={...}` sem alteração obrigatória.

### 3. i18n

Em `src/i18n/locales/pt/report.json`, dentro de `nav`, adicionar:

```
"eyebrow_single": "Análise de perfil",
"eyebrow_multi": "A comparar {{count}} perfis"
```

## Ficheiros a tocar

- `src/components/report-redesign/v2/report-block-nav.tsx` — `SidebarProfile` mantém-se; `SidebarProps` aceita `profile | profiles`; `ProfileHeader` reescrito conforme acima; passar normalização aos dois exports (`ReportBlockSidebar`, `ReportBlockTopTabs` — embora este último não use `ProfileHeader`, mantém assinatura coerente).
- `src/i18n/locales/pt/report.json` — duas chaves novas em `nav`.

## Não alterar

- `LOCKED_FILES.md` (verificar se este ficheiro está listado antes; se estiver, parar e pedir confirmação).
- Lógica de variantes, badges, progresso, tracking, CTA premium.
- `report-shell-v2.tsx` ou outros call sites — a API antiga continua a funcionar.

## Validação

- `bunx tsc --noEmit`
- Verificação visual no preview do `/analyze/$username` com `frederico.m.carvalho` (handle médio) e mentalmente com um handle longo (`@nome.empresa.muito.comprido`) — confirmar truncagem a uma linha.

## Checkpoint

- [ ] Eyebrow "ANÁLISE DE PERFIL" visível por cima do handle
- [ ] Handle trunca com `…` em vez de partir
- [ ] Avatar com anel duplo subtil (imagem e fallback de iniciais)
- [ ] `SidebarProps` aceita `profile` (singular) **e** `profiles` (array)
- [ ] Markup de stacked avatars pronto para `profiles.length > 1` (não ativo hoje)
- [ ] `tsc --noEmit` limpo
- [ ] Sem mudanças em LOCKED_FILES
