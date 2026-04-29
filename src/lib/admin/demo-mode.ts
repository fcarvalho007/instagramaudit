/**
 * Demo mode global do /admin.
 *
 * Por defeito, todas as tabs do admin mostram **dados reais**. Quando o
 * utilizador (admin) ativa o switcher "Modo demonstração" no header, as
 * secções que ainda não têm integração real (Receita/Subscrições, Clientes,
 * Pipeline, etc.) passam a renderizar mockups preenchidos para visualização
 * de layout.
 *
 * Regra de ouro: **a Despesa e qualquer KPI de custo NUNCA respondem ao demo
 * mode** — são sempre reais (Apify, OpenAI, DataForSEO via
 * `provider_call_logs` / `cost_daily`).
 *
 * Persistência: `localStorage` (sobrevive a refresh e a múltiplas tabs do
 * admin). Sincronização entre janelas via `storage` event + custom event
 * para a própria tab.
 */

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "admin.demo_mode.v1";
const EVENT_NAME = "admin:demo-mode-change";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStored(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  // Notifica a própria tab (storage event só dispara em outras tabs).
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: value }));
  } catch {
    /* ignore */
  }
}

export interface DemoModeApi {
  enabled: boolean;
  toggle: () => void;
  set: (v: boolean) => void;
}

export function useDemoMode(): DemoModeApi {
  const [enabled, setEnabled] = useState<boolean>(() => readStored());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setEnabled(e.newValue === "1");
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setEnabled(!!detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onCustom as EventListener);
    };
  }, []);

  const set = useCallback((v: boolean) => {
    writeStored(v);
    setEnabled(v);
  }, []);

  const toggle = useCallback(() => {
    set(!readStored());
  }, [set]);

  return { enabled, toggle, set };
}