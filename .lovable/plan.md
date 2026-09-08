# Fase K — desbloquear a QA Pro real e depois trocar o padrão

A troca do relatório por omissão fica em espera. A auditoria da Fase K continua em
`NOT READY FOR DEFAULT SWITCH` porque nunca existiu uma compra concluída, logo as
secções Pro (diagnóstico, prioridades, conversas completas) nunca foram vistas com
dados reais. Este plano resolve isso primeiro.

## Passo 1 — obter um desbloqueio Pro genuíno

Preciso de uma compra real de 9€ feita por ti, do princípio ao fim:

1. Escolhe um perfil já analisado (sugestão: `karmel.pt`, que tem análise recente e
   completa).
2. Abre o relatório desse perfil e carrega em "Desbloquear Análise Pro (9€)".
3. Conclui o pagamento com o teu método real. O pagamento é confirmado pelo aviso
   automático do fornecedor de pagamentos, que é o que cria o desbloqueio.
4. Diz-me o perfil e o email usados.

Sem este passo não há forma legítima de validar o Pro: não vou inserir desbloqueios
à mão nem inventar dados de teste.

## Passo 2 — QA Pro real (sem alterações de código)

Com o desbloqueio ativo, verifico no relatório real:

- diagnóstico editorial completo, com origem regra/IA correcta;
- prioridades (ordem, máximo de 6, sem duplicados);
- conversas com inteligência de comentários;
- rodapé, metodologia e fontes;
- comparação número a número entre o desenho actual e o novo, para confirmar que
  nada muda;
- 1440px e 375px, sem transbordos nem erros.

## Passo 3 — decisão pendente do envolvimento

Um número diverge entre os dois desenhos: a referência de envolvimento aparece como
4,80% num e 5,60% no outro. Preciso que escolhas qual é a correcta antes da troca;
alinho o outro lado sem mexer em cálculos do perfil.

## Passo 4 — troca do padrão (só depois de 2 e 3)

Quando a Fase K passar a `READY FOR DEFAULT SWITCH`:

- o novo desenho passa a ser o padrão em `/analyze/:username` e `/reports/:snapshotId`;
- `?report_design=legacy` mostra o relatório anterior (recuo imediato num só passo);
- `?report_design=editorial_v2` continua a funcionar;
- valores inválidos caem no novo padrão;
- o selo "Preview" deixa de aparecer ao público;
- pré-visualização de administração, laboratório de relatórios e PDF ficam como estão.

Alterações previstas: apenas a camada que escolhe o desenho (rota de análise, rota de
relatório histórico, leitor da variante) mais testes. Sem tocar em dados, acessos,
pagamentos, créditos ou PDF.

## Ponto de situação

- Bloqueador já corrigido: o mix de formatos deixou de aparecer a quem ainda não
  deixou o email.
- Em falta: compra Pro real (passo 1) e decisão sobre o valor de referência (passo 3).
