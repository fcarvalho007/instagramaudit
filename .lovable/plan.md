# Forçar /report/example sempre em tema claro (sem flicker)

## Problema confirmado

O flicker existe porque `ReportThemeWrapper` aplica `data-theme="light"` dentro de `useEffect`, que só corre **depois** da hidratação. Sequência atual:

1. SSR renderiza HTML sem `data-theme` → `<body>` herda os tokens escuros do `tokens.css`.
2. Browser pinta a página **escura**.
3. React hidrata, `useEffect` corre, adiciona `data-theme="light"` ao `<body>`.
4. Página repinta **branca**.

O salto entre passos 2 e 4 é o flash que estás a ver.

## Solução

Aplicar `data-theme="light"` ao `<body>` **antes** do primeiro paint, em duas frentes que se complementam:

1. **No SSR** — emitir `<body data-theme="light">` directamente no HTML servido para `/report/example`, para que o primeiro byte já chegue com o tema correcto.
2. **Pré-hidratação no cliente** — `<ScriptOnce>` que confirma/aplica `data-theme="light"` antes de qualquer CSS resolver, cobrindo navegação SPA (entrar em /report/example a partir de outra rota).

Não há toggle, não há persistência, não há detecção de sistema. A página abre branca e fica branca, coerente com o posicionamento editorial do mockup.

## Alterações

### 1. `src/components/report/report-theme-wrapper.tsx` (refactor)

Remover o `useEffect`. Substituir por:

- `<ScriptOnce>` com um snippet mínimo que faz `document.body.setAttribute("data-theme","light")` — corre antes do React hidratar, sem flash em navegação SPA.
- `useEffect` de **cleanup apenas** que remove `data-theme` ao desmontar (volta ao escuro quando o utilizador navega para fora).

### 2. `src/routes/__root.tsx` (alteração mínima e segura)

Adicionar `suppressHydrationWarning` ao `<body>` para evitar warning de hidratação quando o `data-theme` é aplicado antes do React (boa prática documentada do TanStack para scripts pré-hidratação).

### 3. SSR-time body attribute para a rota /report/example

Para garantir que **o primeiro byte HTML já chega com `data-theme="light"`** (eliminando o flash mesmo em hard reload), adicionar no `head()` da rota `/report/example` um `script` inline que corre imediatamente e aplica o atributo antes do primeiro paint:

```ts
head: () => ({
  meta: [...existentes],
  scripts: [
    {
      children: `document.body.setAttribute("data-theme","light")`,
    },
  ],
})
```

Este script é injectado pelo `<Scripts />` do root e executa síncronamente antes do React montar, eliminando o flash em hard reload, navegação SPA e back/forward.

## O que NÃO mexo

- `src/components/report/report-page.tsx` e todos os componentes do relatório — intactos.
- `src/styles/tokens-light.css` — já está bem feito.
- `src/styles.css`, `tokens.css` — sem alterações.
- Nenhuma outra rota afectada (cleanup remove o atributo ao sair).
- Sem toggle, sem `localStorage`, sem `prefers-color-scheme`.

## Validação

- Hard reload em `/report/example` → abre directamente branco, sem flash escuro.
- Navegação SPA de `/` para `/report/example` → transição limpa para branco.
- Navegação de `/report/example` para `/admin` → volta ao tema escuro padrão.
- Sem warnings de hidratação na consola.
- Build TypeScript verde.
