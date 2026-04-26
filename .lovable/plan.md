## Auditoria após migração para Google Sign-in

A migração está **funcional e segura**. O cockpit funciona com `fredericodigital@gmail.com`, a allowlist faz fail-closed, e o fluxo de bloqueio + signOut automático está correto. Identifico 6 refinamentos com prioridades distintas — tu escolhes quais aplicar antes do smoke test do Apify.

---

### P0 — Bloqueador suave (recomendo aplicar antes do smoke test)

**1. `denied` deve forçar re-evaluação após "Entrar com outra conta"**

Em `src/routes/admin.tsx`, o botão "Entrar com outra conta" no estado `denied` faz apenas `setAuthState("signed_out")`. Mas o `AdminGate` apresentado a seguir pode mostrar o botão Google enquanto o cookie OAuth do Google ainda tem a conta anterior memorizada — e o utilizador entra outra vez na mesma conta bloqueada sem o seletor de conta.

**Fix:** No fluxo Google em `admin-gate.tsx`, passar `extraParams: { prompt: "select_account" }` para forçar o seletor de contas Google em cada login. Custo zero, melhora UX significativamente quando há múltiplas contas Google no browser.

---

### P1 — Refinamentos de robustez (recomendo)

**2. Race entre `getSession()` e `onAuthStateChange()` chama `whoami` duas vezes**

No `useEffect` de `admin.tsx`, ambos disparam `evaluate()`. Em login fresco isso significa duas chamadas a `/api/admin/whoami` em paralelo (e potencialmente dois `signOut()` se denied). Não é bug crítico, mas é desnecessário e pode produzir flashes de UI.

**Fix:** Guardar o último `access_token` avaliado num `useRef`; só chamar `evaluate()` se mudou.

**3. `whoami` não tem cache headers**

O endpoint devolve sempre `200` mesmo quando não autenticado. Adicionar `Cache-Control: no-store` para evitar que algum proxy/CDN interpretasse mal a resposta.

**4. Diferenciação de erros de rede vs sessão expirada**

`useCockpitData` mostra apenas `Erro {status}`. Quando o token Supabase expira (sessão > 1h sem actividade), o utilizador vê `Erro 401` e não percebe que precisa de re-login. O ideal: ao receber 401 do `adminFetch`, disparar `supabase.auth.signOut()` e voltar ao gate.

**Fix:** `adminFetch` interceta `401` e despoleta evento global (ou `supabase.auth.signOut()` directamente).

---

### P2 — Limpeza opcional

**5. Documentar comportamento "fail-closed" no admin-gate**

Se algum dia o secret `ADMIN_ALLOWED_EMAILS` for apagado por engano, todos os logins ficam bloqueados sem mensagem clara (vão sempre para "denied"). Sugestão: o `whoami` poderia devolver um campo extra `{ reason: "no_allowlist_configured" }` quando `getAdminAllowlist().length === 0`, e o gate mostrar "Backoffice em manutenção". Baixa prioridade — não afecta o smoke test.

**6. Remover dependências mortas (verificar)**

Após eliminação de `auth.ts` e `logout.ts`, confirmar que nenhum import em `cockpit/parts/*` ou `cockpit/panels/*` aponta para esses ficheiros antigos. (Auditoria rápida com `rg` confirma que está limpo, mas vale a pena revalidar com `tsc --noEmit` antes do smoke test.)

---

### O que NÃO toca

- `requireAdminSession()` — está correcto.
- `INTERNAL_API_TOKEN` — continua a proteger só `?refresh=1` em `/api/analyze-public-v1.ts`. Intacto.
- Allowlist Apify (`APIFY_ALLOWLIST`, `APIFY_ENABLED`) — intacto.
- `/report.example`, PDF, email — intactos.

---

### Decisão

Diz qual queres aplicar:

- **A) Só P0 (1 mudança):** `prompt: "select_account"` no Google OAuth. ~2 linhas. Pronto para smoke test em <1min.
- **B) P0 + P1 (4 mudanças):** acima + dedup de `evaluate`, cache header em `whoami`, auto-logout no 401. ~30 linhas, melhora robustez para uso real.
- **C) Tudo (P0+P1+P2):** acima + mensagem de manutenção quando allowlist vazia. ~50 linhas.

Recomendação: **B**. Garante que durante o teste real do Apify (que pode demorar minutos com a sessão activa) não apanhas 401 silencioso nem flashes de UI duplicados.

---

### Validação pós-implementação

1. `bunx tsc --noEmit` — zero erros.
2. Login em janela anónima com `fredericodigital@gmail.com` → cockpit aparece.
3. Login com outra conta Google → "Acesso restrito" + signOut automático.
4. Após "Entrar com outra conta", o seletor de contas Google aparece (P0).
5. Esperar ~65min com cockpit aberto (ou forçar `signOut` numa tab paralela) → próxima acção devolve 401 e redireciona ao gate sem ficar bloqueado em "Erro 401" (P1).
