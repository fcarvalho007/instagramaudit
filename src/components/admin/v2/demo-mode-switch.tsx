/**
 * DemoModeSwitch — switcher global no header do /admin para alternar entre:
 *   - Real (default): cada secção lê dados reais; secções sem integração
 *     mostram empty state honesto.
 *   - Demo: secções que ainda não têm dados reais mostram mockups
 *     preenchidos para visualização de layout e contexto.
 *
 * IMPORTANTE: Despesa (Apify/OpenAI/DataForSEO) é sempre real, ignora este
 * estado.
 */

import { useDemoMode } from "@/lib/admin/demo-mode";

export function DemoModeSwitch() {
  const { enabled, toggle } = useDemoMode();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={toggle}
      title={
        enabled
          ? "Modo demonstração ativo — secções sem integração real mostram dados fictícios. Clica para voltar a dados reais. Custos são sempre reais."
          : "Ativar modo demonstração para preencher secções ainda não ligadas a dados reais (Receita, Clientes, etc.). Custos permanecem sempre reais."
      }
      className="group inline-flex items-center gap-2 rounded-md border border-admin-border bg-admin-surface px-2.5 py-1.5 text-[11px] font-medium text-admin-text-secondary transition-colors hover:border-admin-text-tertiary hover:text-admin-text-primary"
    >
      <span
        aria-hidden="true"
        className="relative inline-flex h-3.5 w-7 items-center rounded-full transition-colors"
        style={{
          backgroundColor: enabled
            ? "rgb(6 182 212)" /* cyan-500 */
            : "rgba(136,135,128,0.28)",
        }}
      >
        <span
          className="absolute h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: enabled ? "translateX(15px)" : "translateX(2px)" }}
        />
      </span>
      <span className="text-eyebrow-sm">
        {enabled ? "Demo" : "Real"}
      </span>
    </button>
  );
}