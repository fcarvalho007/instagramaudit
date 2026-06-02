/**
 * Persistência leve do form do onboarding em sessionStorage.
 *
 * - Carrega defaults no primeiro mount (Zod-safe; se inválido, descarta).
 * - Persiste, com debounce, sempre que campos mudam.
 * - Limpa em sucesso (caller chama `clear()` após `onSuccess`).
 *
 * Não persiste `gdpr_consent` (consentimento é por-sessão de submissão).
 *
 * Cross-handle: a identidade (`full_name`, `email`, `phone`,
 * `marketing_consent`) persiste entre handles diferentes; as respostas
 * contextuais (`profile_ownership`, `goal`) só são restauradas se o
 * handle actual for igual ao `last_handle` guardado.
 */
import { useEffect, useRef } from "react";
import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";

import { type UnlockFormValues } from "@/lib/unlock-flow";

const STORAGE_KEY = "onboarding_draft_v1";

const DraftSchema = z
  .object({
    full_name: z.string().max(120).optional(),
    email: z.string().max(255).optional(),
    phone: z.string().max(40).optional(),
    profile_ownership: z.string().max(40).optional(),
    goal: z.string().max(40).optional(),
    marketing_consent: z.boolean().optional(),
    last_handle: z.string().max(64).optional(),
  })
  .strict();

export type OnboardingDraft = z.infer<typeof DraftSchema>;

function readStorage(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = DraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    return null;
  }
}

function writeStorage(draft: OnboardingDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {}
}

export function clearOnboardingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function loadOnboardingDraft(): OnboardingDraft | null {
  return readStorage();
}

/**
 * Pure helper — devolve apenas os campos do draft seguros para hidratar o
 * form, dado o handle actual.
 *
 * - identidade (full_name/email/phone/marketing_consent) preserva-se sempre
 * - profile_ownership/goal só se `draft.last_handle === currentHandle`
 */
export function selectDraftForHandle(
  draft: OnboardingDraft | null,
  currentHandle: string,
): OnboardingDraft | null {
  if (!draft) return null;
  const sameHandle =
    typeof draft.last_handle === "string" &&
    draft.last_handle.length > 0 &&
    draft.last_handle === currentHandle;
  if (sameHandle) return draft;
  return {
    full_name: draft.full_name,
    email: draft.email,
    phone: draft.phone,
    marketing_consent: draft.marketing_consent,
    // contexto resetado
    profile_ownership: undefined,
    goal: undefined,
    last_handle: draft.last_handle,
  };
}

/**
 * Wire um form de react-hook-form para persistir/hidratar via sessionStorage.
 * Hidratação ocorre uma única vez no primeiro mount (não force-write em rerenders).
 */
export function useOnboardingDraft(
  form: UseFormReturn<UnlockFormValues>,
  handle: string,
): { clear: () => void } {
  const hydratedRef = useRef(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normalizedHandle = handle.trim().toLowerCase();

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const draft = selectDraftForHandle(readStorage(), normalizedHandle);
    if (!draft) return;
    form.reset(
      {
        ...form.getValues(),
        full_name: draft.full_name ?? "",
        email: draft.email ?? "",
        phone: draft.phone ?? "",
        profile_ownership: (draft.profile_ownership ?? undefined) as never,
        goal: (draft.goal ?? undefined) as never,
        marketing_consent: draft.marketing_consent ?? false,
      },
      { keepDefaultValues: true },
    );
  }, [form, normalizedHandle]);

  useEffect(() => {
    const sub = form.watch((values) => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(() => {
        writeStorage({
          full_name: values.full_name || undefined,
          email: values.email || undefined,
          phone: values.phone || undefined,
          profile_ownership: values.profile_ownership || undefined,
          goal: values.goal || undefined,
          marketing_consent: values.marketing_consent ?? undefined,
          last_handle: normalizedHandle || undefined,
        });
      }, 300);
    });
    return () => {
      sub.unsubscribe();
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [form, normalizedHandle]);

  return { clear: clearOnboardingDraft };
}