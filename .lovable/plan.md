## Objetivo

1. Esconder a renderização da secção do **Bloco 03 — Desempenho** em `public_mvp`, mantendo-o visível na sidebar como bloqueado (sem alterar lógica de unlock).
2. Uniformizar os títulos de todos os cards visíveis (Blocos 01 e 02) num único tamanho, maior e consistente em mobile.

## Âmbito

Apenas frontend/apresentação. Sem alterações em geração, unlock logic, preços, providers, snapshots, i18n.

---

## 1. Ocultar conteúdo do Bloco 3

**Ficheiro:** `src/components/report-redesign/v2/report-shell-v2.tsx`

Hoje `public_mvp` define `blockPerformance: "lightweight"`, e o shell renderiza a secção com um teaser. Vamos passar a tratar `"lightweight"` como equivalente a "não renderizar conteúdo" no shell (mantendo a sidebar intacta, que continua a marcar o bloco como locked).

Alteração mínima e cirúrgica:

- Substituir as 2 condições que renderizam o Bloco 03 (linha ~236 dentro do `gated` e ~325 fora) de:
  ```
  features.blockPerformance !== "hidden"
  ```
  para:
  ```
  features.blockPerformance === "full"
  ```

Efeito: em `public_mvp` (lightweight) e `hidden`, a secção do Bloco 03 desaparece da página. Em `internal_lab` / `pro_preview` (`full`) continua a aparecer. A sidebar (`report-block-nav.tsx`) não é tocada — continua a mostrar o Bloco 03 como locked dentro do agrupado "4 por desbloquear".

**Nota:** o `PerformanceLockedTeaser` deixa de ser usado em `public_mvp`. Manter a função no ficheiro (já que é usada no ramo `gated`/`full`).

---

## 2. Uniformizar títulos dos cards (Blocos 01 e 02)

**Token único** para títulos de card, em todos os cards públicos:

```
font-display text-[1.25rem] md:text-[1.5rem] font-semibold leading-snug tracking-tight text-content-primary
```

(20px em mobile, 24px em desktop, Fraunces editorial, peso 600 — coerente com o resto do design system.)

Cards a alinhar:

| Ficheiro | Linha aprox. | Tamanho atual |
|---|---|---|
| `overview/editorial-identity-card.tsx` | 401 (h2) | `text-xl sm:text-2xl` |
| `overview/diagnostic-summary.tsx` | 150 (h3) | `text-[0.95rem] sm:text-base` |
| `overview/frequency-card.tsx` | 440 (h3) | `text-[1.25rem] sm:text-[1.5rem] md:text-[2rem]` |
| `overview/format-card.tsx` | 238 (h3) | `text-[1.5rem] md:text-[2rem]` |
| `report-diagnostic-card.tsx` | 182 (h3 variante A) | `text-[1.1rem] sm:text-[1.25rem] md:text-[1.375rem]` |
| `report-diagnostic-card.tsx` | 218 (h3 variante B) | `text-[1rem] sm:text-[1.125rem] md:text-[1.25rem]` |

Para cada um: substituir a parte da classe que controla `font-display + text-* + font-semibold + leading + tracking + text-content-primary` pelo token único acima. Manter classes adicionais existentes (`break-words`, `max-w-2xl`, etc.).

**Não tocado:**
- Métricas grandes dentro dos cards (ex.: `text-[2rem]`, `text-[2.5rem]`) — são valores numéricos, não títulos.
- `DialogTitle` de modais.
- `score-card.tsx` (não tem `<h3>`, só um label `text-base`; já é coerente).

---

## Checkpoint

- [ ] Bloco 03 desaparece do conteúdo do relatório em mobile e desktop (variante `public_mvp`)
- [ ] Sidebar continua a mostrar Bloco 03 dentro do bloco premium locked
- [ ] Todos os títulos de card nos Blocos 01 e 02 ficam `text-[1.25rem] md:text-[1.5rem]` font-display semibold
- [ ] Mobile (375–411px) com leitura consistente, sem títulos desproporcionados
- [ ] `bunx tsc --noEmit` passa
- [ ] `bunx vitest run` passa
- [ ] Sem alterações em unlock logic, preços, providers, snapshots