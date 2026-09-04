# Editorial V2 — Fase J: Metodologia, Fontes e Rodapé

Migra apenas a camada de apresentação de metodologia, fontes e rodapé do relatório para o Editorial V2 (pré-visualização `?report_design=editorial_v2`). Nenhuma secção analítica, cálculo, gating, pagamento, PDF ou navegação é alterada.

## Auditoria feita antes do plano (estado real confirmado)

- Metodologia de produção: `src/components/report-redesign/report-methodology.tsx`, renderizada no shell V2 em `report-shell-v2.tsx` (linha 471) apenas quando `unlocked`.
- Registo de fontes real: `src/lib/knowledge/benchmark-context.ts` — `BENCHMARK_DATASET_VERSION = "2026-05-08"` e quatro fontes: Socialinsider (Fev 2026), Buffer (Mai 2026), Hootsuite (Abr 2026) marcadas `visibility: "active"`, e Databox marcada `future` (excluída). As três primeiras são genuinamente usadas em produção, logo podem ser mostradas; Databox não.
- Data do relatório: `meta.generated_at` do snapshot, já formatada em `snapshot-to-report-data.ts` (`profile.analyzedAt`). Não se usa a data de hoje.
- Nota de fonte externa por cartão: `overview/external-source-note.tsx` + chaves `external_source_note.template/methodology` (pt/en).
- Linha de base de cálculo: `overview/methodology-line.tsx` (amostra, janela, fixadas excluídas).
- Metodologia de comentários: chave `methodology_note` já existente (comentários públicos; sem DMs nem comentários apagados).
- Rodapé do relatório: `src/components/report/report-footer.tsx` — "Relatório gerado a … · AuditProfiles" e "Dados do Instagram público · RGPD compliant · Não afiliado com Meta".
- Rodapé institucional: rotas reais `/precos`, `/privacidade`, `/termos`, `/aviso-legal`, `/cookies` e contacto por email de configuração; ano via `new Date().getFullYear()`.
- `LOCKED_FILES.md` lido: os ficheiros de metodologia/fontes do relatório não estão bloqueados; o rodapé institucional (`layout/footer.tsx`) está bloqueado e não será tocado.

### Dimensões reais (as quatro do HTML avaliadas)

| Dimensão | Suporte real | Decisão |
| --- | --- | --- |
| Recolha automática | Sim — dados públicos do perfil, sem sessão | Mostrar |
| Referência de mercado | Sim — benchmark de escalão + fontes activas | Mostrar |
| Leitura editorial | Sim — leituras geradas a partir dos sinais observados, separadas dos factos | Mostrar |
| Sinais de procura | Oculto no relatório público (`marketSignals: "hidden"` em `public_mvp`) | Omitir no público; só aparece quando a variante já mostra a secção |

## O que será construído

Novos ficheiros em `src/components/report-editorial-v2/methodology/`:

- `methodology-data.ts` — deriva, a partir dos dados já carregados: dimensões válidas para a variante, lista de fontes activas do registo (nome, etiqueta de data quando existe, descrição, URL), versão do dataset e data de recolha do snapshot. Campos em falta são omitidos, nunca inventados.
- `editorial-methodology.tsx` — banda Editorial V2: coluna esquerda com o sobretítulo "Metodologia", título "Como este relatório foi feito" e lede curto; coluna direita com as dimensões reais, a lista de fontes em estilo de citação (hairlines, sem logótipos) e a nota de âmbito/limitação.
- `editorial-report-footer.tsx` — data de recolha real, aviso "Não afiliado com Meta" com a redacção já aprovada, e ligações institucionais existentes.

Integração apenas em `editorial-v2-shell.tsx`, com a mesma condição de visibilidade que produção usa para a metodologia.

## Regras aplicadas

- Zero conteúdo do HTML de referência entra em runtime: nomes, datas e descrições vêm do registo de produção; se o HTML mostra algo sem suporte real, é omitido.
- Ligações externas só quando existe URL real, com `target="_blank" rel="noopener noreferrer"` e rótulo acessível; sem `href="#"`.
- Distinção explícita entre observações recolhidas, cálculos determinísticos e leitura editorial; nunca se afirma que a IA calcula números.
- Nada de `internal_lab` é descrito publicamente.
- Mobile a 375px: intro, uma dimensão por linha, fontes em lista vertical legível, nota e rodapé, sem scroll horizontal.

## Testes e validação

Novos testes de metodologia/fontes cobrindo: contagem dinâmica de fontes, nomes vindos do registo, data em falta omitida, ausência de link falso, data do relatório vinda do snapshot, exclusão de fontes `future`, não exposição de conteúdo lab, e ausência de literais de fontes fora do registo. Mais: metodologia de produção inalterada e presença apenas na variante Editorial V2. Corre-se typecheck, as suítes Editorial V2/relatório/benchmark e QA visual real a 1440px e 375px num relatório real.

O bloqueador "Editorial V2 real Pro QA pending" mantém-se por resolver — pertence à Fase K.

## Ponto que merece decisão

O registo marca `linksAllowedInReport: false` em todas as fontes, mas a metodologia de produção já mostra o link externo de cada fonte. O plano mantém a paridade com o que hoje está em produção (link visível). Se preferires respeitar o campo do registo, mostro só o nome e a data, sem ligação.
