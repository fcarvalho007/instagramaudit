## Contexto

A sidebar comercial actual (`report-block-nav.tsx`) já respeita os 7 itens vindos de `COMMERCIAL_SECTIONS` (incluindo o novo 06 "Diagnóstico editorial") e já distingue estado free (Leitura gratuita / Relatório completo + CTA) de pago (lista única desbloqueada + status pill). Faltam apenas dois ajustes pedidos:

1. **Free**: nota compacta `7 perguntas estratégicas` por baixo do item 06.
2. **Paid**: quando o utilizador está em 06, abrir um pequeno bloco colapsável com sub-itens (Conteúdo, Funil, Hashtags, Legendas, Capas, Audiência, Integração) que fazem scroll para o card respectivo.

Nada muda em pagamento, unlock, pricing, EuPago, cálculos, schema ou geração de relatório.

## Alterações

### 1. `src/components/report-redesign/v2/report-diagnostic-block.tsx` (ramo comercial)
Adicionar IDs DOM a cada card dentro de `#diagnostico-editorial` para permitir scroll a partir dos sub-itens da sidebar (não altera lógica, só envelopes):

- `#diag-conteudo`  → renderContentTypeCard
- `#diag-funil`     → renderFunnelCard
- `#diag-hashtags`  → HashtagDiagnosticsCard
- `#diag-legendas`  → CaptionDiagnosticsCard
- `#diag-capas`     → VisualCoverAnalysisCard
- `#diag-audiencia` → renderAudienceCard
- `#diag-integracao`→ renderIntegrationCard

Cada card é embrulhado em `<div id="…" className="scroll-mt-24">`. Os grupos A/B/E/C/D existentes permanecem inalterados; apenas o conteúdo de cada `ReportDiagnosticGroup` ganha o wrapper de id no card individual. Lab variant não é tocado.

### 2. `src/components/report-redesign/v2/report-block-nav.tsx`

#### 2.1 Constante partilhada
```ts
const DIAGNOSTIC_SUBITEMS = [
  { id: "diag-conteudo",   key: "conteudo"   },
  { id: "diag-funil",      key: "funil"      },
  { id: "diag-hashtags",   key: "hashtags"   },
  { id: "diag-legendas",   key: "legendas"   },
  { id: "diag-capas",      key: "capas"      },
  { id: "diag-audiencia",  key: "audiencia"  },
  { id: "diag-integracao", key: "integracao" },
] as const;
```
Labels traduzidos via `t('nav.diagnostic_subitems.<key>')` (PT + EN).

#### 2.2 Free state — nota sob 06
No bloco de `premium` items (`LockedItemRow`), quando `item.block.id === "diagnostico-editorial"` renderizar imediatamente a seguir ao botão:
```tsx
<p className="pl-9 pr-3 pb-1 text-[11px] text-content-tertiary">
  {t("nav.diagnostic_subitems.note")}  // "7 perguntas estratégicas"
</p>
```
Comportamento clique mantém-se (scroll para `#diagnostico-editorial`, sem abrir modal — já é assim).

#### 2.3 Paid state — sub-itens expansíveis
- Adicionar scroll-spy auxiliar:
  ```ts
  const activeSub = useActiveBlock(DIAGNOSTIC_SUBITEMS.map(s => s.id));
  ```
- Estado controlado `const [diagExpanded, setDiagExpanded] = useState(false)` + auto-abertura quando `active === "diagnostico-editorial"` (efeito).
- Dentro do bloco paid (premiumUnlocked + isCommercial), após o `ItemRow` de 06 renderizar uma lista compacta colapsável (chevron no botão principal — adicionar um botão de toggle isolado ao lado do número, ou simplesmente toggle no clique extra). Para manter o `ItemRow` partilhado, **adicionar uma linha abaixo** (renderizada inline na `<li>`) com a sub-lista quando `(diagExpanded || activeSub) && item.block.id === "diagnostico-editorial"`:
  ```tsx
  <ul className="ml-7 mt-0.5 mb-1 space-y-0 border-l border-border-default/60 pl-3">
    {DIAGNOSTIC_SUBITEMS.map(s => (
      <li key={s.id}>
        <button
          onClick={() => scrollToBlock(s.id)}
          aria-current={activeSub === s.id ? "true" : undefined}
          className={cn(
            "w-full text-left py-1 text-[12px] transition-colors rounded-md px-1.5",
            activeSub === s.id
              ? "text-content-primary font-semibold"
              : "text-content-tertiary hover:text-content-secondary"
          )}
        >
          {t(`nav.diagnostic_subitems.${s.key}`)}
        </button>
      </li>
    ))}
  </ul>
  ```
- Pequeno botão chevron à direita do `ItemRow` de 06 (paid) controla `diagExpanded` (apenas paid). Implementação: estender `ItemRow` com prop opcional `trailing?: ReactNode`. Quando `compact === true`, sub-itens são suprimidos (continua só a lista compacta de 7 botões para não esticar a sidebar).

#### 2.4 Mobile drawer
Reutiliza a mesma `SidebarList`, logo herda automaticamente a nota free e os sub-itens paid. No drawer (`Sheet`), `compact` não está activo, portanto sub-itens aparecem quando 06 estiver activa ou for expandida manualmente.

### 3. i18n
`src/i18n/locales/{pt,en}/report.json` — adicionar:
```json
"nav.diagnostic_subitems": {
  "note": "7 perguntas estratégicas",
  "conteudo": "Conteúdo",
  "funil": "Funil",
  "hashtags": "Hashtags",
  "legendas": "Legendas",
  "capas": "Capas",
  "audiencia": "Audiência",
  "integracao": "Integração",
  "toggle_aria": "Mostrar/esconder sub-itens"
}
```
(EN equivalente: Content / Funnel / Hashtags / Captions / Covers / Audience / Integration; note: "7 strategic questions".)

### 4. Sem alterações
`block-config.ts`, `use-active-block.ts`, `report-shell-v2.tsx`, `report-overview-block.tsx`, classifiers, `payments/*`, `report-variant.ts`, EuPago, schema, ingest/Apify. Lab variant intocada.

## Comportamento final

**FREE**
- Header: eyebrow + handle, "2 de 7 secções acessíveis", barra de progresso 2/7.
- LEITURA GRATUITA: 01 Visão geral · 02 Engagement (badge Grátis).
- RELATÓRIO COMPLETO: 03–07 (LockedItemRow); por baixo de 06 aparece `7 perguntas estratégicas`.
- EXPLORAR: período + concorrente bloqueados (lock icon abre modal — já implementado).
- CTA: "Desbloquear relatório completo" + subcopy existente.

**PAID**
- Header: pill `✓ Relatório completo · 7 secções`.
- Lista única dos 7 itens sem badges.
- Item 06 com chevron de expansão; auto-expande quando o scroll entra em `#diagnostico-editorial`. Sub-itens (7) com scroll-spy próprio dentro do bloco.
- EXPLORAR: período / Add competitor activos (UI existente).
- Sem CTA de desbloqueio.

**Compact (scrolled)**
- Mantém comportamento actual; sub-itens são suprimidos para não esticar a coluna.

## Riscos & salvaguardas
- IDs adicionados em `report-diagnostic-block.tsx` são puramente DOM; não alteram lógica de render. Se um card renderiza `null`, o `<div id="…">` correspondente simplesmente não é criado e o scroll cai no top de 06 (já testado pelo `scrollToBlock` que fallbacks para o item pai quando o id não existe).
- Auto-expand do 06 é UX-only; não bloqueia nada.
- Mobile drawer herda mudanças via componente partilhado — sem duplicação.

## Validação manual
1. Free: itens 01–02 desbloqueados, 03–07 bloqueados, "7 perguntas estratégicas" visível sob 06, CTA presente.
2. Free: clicar em 06 faz scroll para `#diagnostico-editorial` (teaser premium permanece visível, sem abrir modal).
3. Free: clicar em chip de período / Add competitor abre modal existente (sem mudança).
4. Paid: header com pill, 7 secções, sem CTA.
5. Paid: scroll para 06 expande automaticamente a sub-lista; cada sub-item destaca-se conforme o utilizador desce pelos cards.
6. Paid: clicar num sub-item faz scroll suave para o card correspondente.
7. Sidebar continua a colapsar (compact) no scroll; sub-itens são escondidos em compact.
8. Mobile: rail + drawer continuam a funcionar; drawer mostra nota free e sub-itens paid.
9. Lab variant inalterada.
10. Sem regressão em logs, pagamento, EuPago, métricas, relatório ou schema.
