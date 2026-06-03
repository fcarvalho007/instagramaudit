## Diagnóstico atual

No preview que abri em `/`, a homepage aparece em dark corretamente: header navy, hero dark e CTA roxo. Isto indica que o código atual já contém a versão dark.

A inconsistência mais provável é uma destas duas situações:

1. **URL presa a uma versão antiga**: a sessão anterior estava a abrir `/?__lovable_sha=71d649b9`, que força uma build antiga no preview.
2. **Domínio publicado/custom domain desatualizado**: se estiver a ver `auditprofiles.com` ou `instagramaudit.lovable.app`, pode estar a ver a versão publicada anterior, não o preview mais recente.
3. **Fallback de shell/light por rota ou hidratação**: se algum URL não for exatamente `/`, o `AppShell` pode não entrar no ramo `isHome` e renderizar header/footer light.

## Plano de correção

1. **Confirmar todos os URLs que estão a servir a homepage**
   - Testar `/` no preview sem `?__lovable_sha`.
   - Testar a mesma rota com query string.
   - Confirmar se o problema aparece no preview ou só no domínio publicado/custom domain.

2. **Tornar a deteção da homepage mais robusta**
   - Ajustar o `AppShell` para tratar a homepage dark de forma explícita e resistente a variações de URL.
   - Garantir que qualquer renderização de `/` usa sempre `Header variant="dark"`, `DarkFooter` e wrapper `.hero-dark`.

3. **Blindar o fundo dark no nível da página**
   - Além do `AppShell`, envolver a própria route `/` num contexto dark mínimo.
   - Isto impede que a homepage volte a mostrar fundo light caso o shell falhe ou a hidratação renderize um estado intermédio.

4. **Rever header/footer sem mexer em ficheiros gerados**
   - Confirmar que `Header` não depende de variáveis CSS fora do scope `.hero-dark`.
   - Confirmar que `DarkFooter` não revela fundo transparente branco.
   - Não voltar a editar `src/routeTree.gen.ts`, porque é ficheiro gerado.

5. **Refresh/validação final**
   - Recarregar `/` no preview.
   - Validar visualmente header, primeira dobra, transição para a segunda dobra e footer.
   - Se o problema só existir no domínio publicado, a correção final é publicar a versão atual depois da validação.