## Refinamentos da tab Perfis

Após avaliar o resultado actual, identifiquei melhorias semânticas e visuais que aumentam a leitura editorial sem alterar a estrutura aprovada. Sem novas secções, sem novos componentes — apenas polimento.

---

## 1 · Top perfis · barra "stacked" em vez de barra dupla

**Problema:** Cada linha do ranking mostra hoje 2 barras horizontais separadas (cinza para análises, coral para reports), ambas relativas ao mesmo eixo (max das análises). Lê-se como duas séries paralelas quando na realidade reports são um subconjunto das análises.

**Solução:** Uma barra única — track cinza com largura proporcional às análises, com fill coral interno proporcional aos reports / análises desse perfil. Lê-se imediatamente como "deste volume, isto converteu".

**Ficheiro:** `src/components/admin/v2/perfis/top-profiles-section.tsx` · função `RankingRow`.

```tsx
// Em vez de 2 <div> stacked:
<div
  className="mt-2 h-1.5 overflow-hidden rounded-full"
  style={{ width: `${analysesPct}%`, backgroundColor: profileBarAnalyses }}
>
  <div
    className="h-full rounded-full"
    style={{ width: `${reportsFillPct}%`, backgroundColor: profileBarReports }}
  />
</div>
```

Onde `reportsFillPct = round((reports / analyses) * 100)` (relativo, dentro da própria barra).

Adicional:
- Posição mono → `text-right` + `tabular-nums` para alinhar `01`–`10`.
- Stats à direita → `tabular-nums` para alinhar dígitos.
- Header da coluna esquerda passa de `Ranking top 10` (redundante com título da secção) para `Volume vs reports pagos` + sub `Top 10 perfis · barra cinza = análises totais, fill coral = reports pagos`.
- Gap entre linhas reduz de `gap-3.5` para `gap-3` (barra única ocupa menos altura vertical).

---

## 2 · Donut · número central mais limpo + separador visual

**Problema:** O `284` no centro do donut está em `text-3xl`/`2rem` sem `tabular-nums` e o label `perfis` está em sentence-case 11px. A legenda imediatamente abaixo cola-se ao donut sem separador.

**Solução:**
- Número central: `1.875rem`, `tabular-nums`, `letterSpacing -0.02em`.
- Label central: `10px` uppercase com `tracking 0.08em` (eyebrow editorial).
- Pie: adicionar `cornerRadius={3}` para fatias com cantos suaves.
- Legenda: `border-t border-admin-border` + `pt-4` para separar do donut.
- Legenda: colunas `pct` e `count` com largura fixa `w-10` + `tabular-nums` (alinha verticalmente).

**Ficheiro:** mesmo, função `CategoryColumn`.

---

## 3 · Tabela · cor da mini-barra "Análises" deve ser cinza, não coral

**Problema:** Na coluna "Análises" da tabela, a mini-barra usa `profileBarReports` (coral) — confunde semanticamente porque coral é a cor dos reports.

**Solução:**
- Track da mini-barra: `profileFunnelBase` (cinza claro).
- Fill: `profileBarAnalyses` (cinza médio) — não coral.
- Adicionar `tabular-nums` a todas as colunas mono (Análises, Reports, Conversão, Receita) para alinhamento profissional dos dígitos.

**Ficheiro:** `src/components/admin/v2/perfis/profiles-table-section.tsx` · `ProfileRow`.

---

## 4 · Tabela · `0.0%` para perfis sem reports → `—`

**Problema:** `@cristianoronaldo` (18 análises, 0 reports) mostra `0.0%` em vermelho. Tecnicamente correcto, mas visualmente ruidoso e nada accionável — aparece igual a falha. Mais elegante: `—` em tertiary.

**Solução:** Quando `reports === 0`, mostrar `—` na coluna Conversão com `text-admin-text-tertiary` (ignorar semáforo). Mantém o vermelho semafórico só para casos com reports e taxa baixa.

**Ficheiro:** mesmo, célula da conversão.

---

## 5 · Funil por perfil · legenda abaixo da barra (não ao lado)

**Problema:** As mini-barras com label inline (`<barra> 47 análises grátis`) ficam apertadas para perfis com 100% do eixo, e a label corta ou empurra para fora. Lê-se mal.

**Solução:** Layout column — barra em cima ocupando largura proporcional, label `tabular-nums` 11px tertiary imediatamente abaixo. Cria 2 "blocos" por perfil em vez de 2 linhas inline-flex.

Adicional: Indicador de conversão à direita do header passa de `25.5%` solto para `conv. 25.5%` com eyebrow uppercase 10px à esquerda do número (mais legível como métrica).

Adicional: barra com `minWidth: 4` para perfis com `0` reports não desaparecerem completamente.

**Ficheiro:** `src/components/admin/v2/perfis/intent-opportunities-section.tsx` · `FunnelRow` (extracção de subcomponente `FunnelBar`).

---

## 6 · Validação

```bash
bunx tsc --noEmit
bun run build
```

---

## Não alterado

- Estrutura das 4 secções (mesma ordem, mesmos accents)
- Mock data (`mock-data.ts`)
- Componentes partilhados (`AdminCard`, `AdminBadge`, `AdminAvatar`, `AdminInfoTooltip`, etc.)
- KPIs da secção 1 (já refinados)
- Pesquisas repetidas (já com layout limpo)

---

## Checklist

- ☐ Ranking: barra única stacked (cinza track + coral fill interno)
- ☐ Posição e stats com `tabular-nums`
- ☐ Header da coluna esquerda renomeado
- ☐ Donut: `cornerRadius=3`, número central refinado, legenda separada por border-top
- ☐ Tabela: mini-barra "Análises" em cinza
- ☐ Tabela: `tabular-nums` em todas as colunas mono
- ☐ Tabela: `—` em vez de `0.0%` quando 0 reports
- ☐ Funil: legenda abaixo da barra + eyebrow `conv.`
- ☐ Funil: `minWidth: 4` para barras vazias
- ☐ `bunx tsc --noEmit` ✓
- ☐ `bun run build` ✓