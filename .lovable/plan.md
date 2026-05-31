## Âmbito

Dois ajustes pequenos no Bloco 1 do relatório público.

---

### 1. Esconder "Como este relatório foi feito" antes do lead magnet

`src/components/report-redesign/v2/report-shell-v2.tsx` linha 380 renderiza `<ReportMethodology />` sempre. Passa a renderizar **só quando `unlocked === true`** (estado B/C — lead já capturado ou premium).

```tsx
{unlocked && <ReportMethodology />}
```

Resultado: utilizador anónimo (estado A) vê apenas Identity Card + lead magnet card; a secção de metodologia aparece a seguir à captura, junto com `BlockFeedback` e `ReportEndOfFreeBlock`.

### 2. Uniformizar tipografia das colunas "O que já funciona / O que limita"

`src/components/report-redesign/v2/overview/editorial-identity-card.tsx` — `BulletColumn` actualmente usa `text-[15px] leading-[1.55]` enquanto o parágrafo do veredicto editorial usa `text-[17px] leading-[1.65]`. Visualmente as colunas parecem encolhidas.

Mudança no `<li>` dos bullets (linha ~842):

```diff
- <li key={i} className="flex gap-2.5 text-[15px] leading-[1.55]">
+ <li key={i} className="flex gap-2.5 text-[17px] leading-[1.65]">
```

Tudo o resto (eyebrow da coluna, espaçamento `space-y-2.5`, fundo `signal-success/warning`, bordas) permanece. As colunas continuam Inter, com `font-medium` no destaque e `text-content-primary` no detalhe.

---

## O que NÃO muda

- Conteúdo / copy dos bullets, derivação de strengths/limits, fluxo de unlock, schema, restantes blocos.
- `ReportMethodology` mantém-se intacto — só muda o sítio em que aparece no fluxo público.

## Validação

- `bunx tsc --noEmit`
- QA visual em `/analyze/frederico.m.carvalho`:
  - Estado A (anónimo): `ReportMethodology` ausente.
  - Estado B (lead capturado): `ReportMethodology` reaparece a seguir ao `BlockFeedback` / `ReportEndOfFreeBlock`.
  - Bloco 1: colunas e parágrafo do veredicto com a mesma escala visual (17px).
