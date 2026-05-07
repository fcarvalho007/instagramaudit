/**
 * Module Visibility Matrix — admin-only interactive matrix to manage
 * which report modules are visible in each variant (public_mvp, internal_lab, pro_preview).
 *
 * Supports draft → preview → publish lifecycle.
 */

import { useCallback, useEffect, useState } from "react";
import {
  type ReportVariant,
  type FeatureVisibility,
  type VariantFeatures,
  FEATURE_LABELS,
  getVariantFeatures,
} from "@/lib/report/report-variant";
import { isModuleLocked, getLockedValue } from "@/lib/report/effective-features";
import {
  getAllOverrides,
  saveVariantDraft,
  publishVariantDraft,
  discardVariantDraft,
  resetVariantDefaults,
} from "@/server/admin/variant-overrides.functions";
import { cn } from "@/lib/utils";
import { Lock, Save, Upload, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const VARIANTS: { value: ReportVariant; label: string }[] = [
  { value: "public_mvp", label: "Public MVP" },
  { value: "internal_lab", label: "Internal Lab" },
  { value: "pro_preview", label: "Pro Preview" },
];

const VIS_OPTIONS: { value: FeatureVisibility; label: string; cls: string }[] = [
  { value: "full", label: "Full", cls: "text-green-700" },
  { value: "lightweight", label: "Lightweight", cls: "text-blue-700" },
  { value: "teaser", label: "Teaser", cls: "text-purple-700" },
  { value: "hidden", label: "Hidden", cls: "text-gray-500" },
];

type OverrideMap = Record<ReportVariant, {
  draft: Partial<VariantFeatures> | null;
  published: Partial<VariantFeatures> | null;
}>;

const emptyMap = (): OverrideMap => ({
  public_mvp: { draft: null, published: null },
  internal_lab: { draft: null, published: null },
  pro_preview: { draft: null, published: null },
});

interface Props {
  adminEmail: string;
  onPreviewDraft?: (variant: ReportVariant) => void;
}

export function ModuleVisibilityMatrix({ adminEmail, onPreviewDraft }: Props) {
  const [overrides, setOverrides] = useState<OverrideMap>(emptyMap());
  const [localDrafts, setLocalDrafts] = useState<Record<ReportVariant, Partial<VariantFeatures>>>({
    public_mvp: {},
    internal_lab: {},
    pro_preview: {},
  });
  const [dirty, setDirty] = useState<Record<ReportVariant, boolean>>({
    public_mvp: false,
    internal_lab: false,
    pro_preview: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ReportVariant | null>(null);
  const [publishing, setPublishing] = useState<ReportVariant | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<ReportVariant | null>(null);

  const featureKeys = Object.keys(FEATURE_LABELS) as (keyof VariantFeatures)[];

  // ── Load overrides from server ──────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { rows } = await getAllOverrides();
      const map = emptyMap();
      for (const row of rows) {
        const v = row.variant as ReportVariant;
        if (map[v]) {
          if (row.is_draft) {
            map[v].draft = row.features_json as Partial<VariantFeatures>;
          } else {
            map[v].published = row.features_json as Partial<VariantFeatures>;
          }
        }
      }
      setOverrides(map);
      // Initialize local drafts from server drafts or published
      const newLocal: Record<ReportVariant, Partial<VariantFeatures>> = {
        public_mvp: {},
        internal_lab: {},
        pro_preview: {},
      };
      for (const v of VARIANTS) {
        newLocal[v.value] = { ...(map[v.value].draft ?? map[v.value].published ?? {}) };
      }
      setLocalDrafts(newLocal);
      setDirty({ public_mvp: false, internal_lab: false, pro_preview: false });
    } catch (e) {
      toast.error("Erro ao carregar overrides.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Get effective value for display ─────────────────────────────
  const getDisplayValue = (key: keyof VariantFeatures, variant: ReportVariant): FeatureVisibility => {
    const locked = getLockedValue(key, variant);
    if (locked !== undefined) return locked;
    const localVal = localDrafts[variant]?.[key];
    if (localVal) return localVal;
    return getVariantFeatures(variant)[key];
  };

  // ── Handle cell change ──────────────────────────────────────────
  const handleChange = (key: keyof VariantFeatures, variant: ReportVariant, value: FeatureVisibility) => {
    const staticVal = getVariantFeatures(variant)[key];
    setLocalDrafts((prev) => {
      const updated = { ...prev[variant] };
      if (value === staticVal) {
        delete updated[key];
      } else {
        updated[key] = value;
      }
      return { ...prev, [variant]: updated };
    });
    setDirty((prev) => ({ ...prev, [variant]: true }));
  };

  // ── Save draft to server ────────────────────────────────────────
  const handleSaveDraft = async (variant: ReportVariant) => {
    setSaving(variant);
    try {
      await saveVariantDraft({ data: { variant, features: localDrafts[variant], adminEmail } });
      toast.success(`Draft de ${variant} guardado.`);
      setDirty((prev) => ({ ...prev, [variant]: false }));
      await refresh();
    } catch {
      toast.error("Erro ao guardar draft.");
    } finally {
      setSaving(null);
    }
  };

  // ── Publish ─────────────────────────────────────────────────────
  const handlePublish = async (variant: ReportVariant) => {
    setPublishing(variant);
    try {
      // Save draft first if dirty
      if (dirty[variant]) {
        await saveVariantDraft({ data: { variant, features: localDrafts[variant], adminEmail } });
      }
      await publishVariantDraft({ data: { variant, adminEmail } });
      toast.success(`${variant} publicado. Alterações visíveis publicamente.`);
      setConfirmPublish(null);
      await refresh();
    } catch {
      toast.error("Erro ao publicar.");
    } finally {
      setPublishing(null);
    }
  };

  // ── Discard draft ───────────────────────────────────────────────
  const handleDiscard = async (variant: ReportVariant) => {
    try {
      await discardVariantDraft({ data: { variant } });
      toast.success("Draft descartado.");
      await refresh();
    } catch {
      toast.error("Erro ao descartar draft.");
    }
  };

  // ── Reset to defaults ───────────────────────────────────────────
  const handleReset = async (variant: ReportVariant) => {
    try {
      await resetVariantDefaults({ data: { variant } });
      toast.success("Reset para defaults estáticos.");
      await refresh();
    } catch {
      toast.error("Erro ao fazer reset.");
    }
  };

  const hasDraft = (v: ReportVariant) => overrides[v].draft !== null;
  const hasPublished = (v: ReportVariant) => overrides[v].published !== null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-6 text-sm text-admin-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        A carregar configuração de visibilidade…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Publish confirmation dialog */}
      {confirmPublish && (
        <div className="mx-4 mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Isto altera o que os utilizadores públicos veem.</p>
          <p className="mt-1 text-xs text-amber-600">
            A variante <strong>{confirmPublish}</strong> será atualizada publicamente.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => handlePublish(confirmPublish)}
              disabled={publishing !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Confirmar publicação
            </button>
            <button
              onClick={() => setConfirmPublish(null)}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/20 bg-white/10">
              <th className="px-4 py-2 font-medium text-admin-text-secondary">Módulo</th>
              {VARIANTS.map((v) => (
                <th key={v.value} className="px-4 py-2 font-medium text-admin-text-secondary">
                  <div className="flex items-center gap-2">
                    {v.label}
                    {hasDraft(v.value) && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                        draft
                      </span>
                    )}
                    {hasPublished(v.value) && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-700">
                        pub
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureKeys.map((key) => (
              <tr key={key} className="border-t border-white/10">
                <td className="px-4 py-2 text-admin-text-primary">
                  <span className="flex items-center gap-1.5">
                    {FEATURE_LABELS[key]}
                    {featureKeys.some(() => isModuleLocked(key, "public_mvp") || isModuleLocked(key, "pro_preview")) && (
                      <Lock className="h-3 w-3 text-admin-text-tertiary" />
                    )}
                  </span>
                </td>
                {VARIANTS.map((v) => {
                  const locked = isModuleLocked(key, v.value);
                  const val = getDisplayValue(key, v.value);
                  const staticVal = getVariantFeatures(v.value)[key];
                  const isOverridden = val !== staticVal;

                  return (
                    <td key={v.value} className="px-4 py-2">
                      {locked ? (
                        <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase text-gray-500">
                          <Lock className="h-2.5 w-2.5" />
                          {val}
                        </span>
                      ) : (
                        <select
                          value={val}
                          onChange={(e) => handleChange(key, v.value, e.target.value as FeatureVisibility)}
                          className={cn(
                            "rounded border px-2 py-1 text-[11px] font-medium",
                            isOverridden
                              ? "border-amber-300 bg-amber-50 text-amber-800"
                              : "border-white/30 bg-white/50 text-admin-text-primary",
                          )}
                        >
                          {VIS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action buttons per variant */}
      <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-3">
        {VARIANTS.map((v) => (
          <div key={v.value} className="flex flex-wrap gap-1.5">
            <span className="w-full text-[10px] font-semibold uppercase tracking-wider text-admin-text-tertiary mb-1">
              {v.label}
            </span>
            <button
              onClick={() => handleSaveDraft(v.value)}
              disabled={!dirty[v.value] || saving !== null}
              className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/50 px-2.5 py-1 text-[10px] font-medium text-admin-text-secondary hover:bg-white/70 disabled:opacity-40"
            >
              {saving === v.value ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Guardar draft
            </button>
            <button
              onClick={() => setConfirmPublish(v.value)}
              disabled={!hasDraft(v.value) && !dirty[v.value]}
              className="inline-flex items-center gap-1 rounded-lg border border-green-300 bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700 hover:bg-green-100 disabled:opacity-40"
            >
              <Upload className="h-3 w-3" />
              Publicar
            </button>
            {onPreviewDraft && (
              <button
                onClick={() => onPreviewDraft(v.value)}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
              >
                Preview draft
              </button>
            )}
            {hasDraft(v.value) && (
              <button
                onClick={() => handleDiscard(v.value)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
                Descartar
              </button>
            )}
            {hasPublished(v.value) && (
              <button
                onClick={() => handleReset(v.value)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/30 px-2.5 py-1 text-[10px] font-medium text-admin-text-tertiary hover:bg-white/30"
              >
                <RotateCcw className="h-3 w-3" />
                Reset defaults
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}