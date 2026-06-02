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
} from "@/lib/admin/variant-overrides.functions";
import { cn } from "@/lib/utils";
import { Lock, Save, Upload, Trash2, RotateCcw, Loader2, ExternalLink, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const VARIANTS: { value: ReportVariant; label: string }[] = [
  { value: "public_mvp", label: "Public MVP" },
  { value: "internal_lab", label: "Internal Lab" },
  { value: "pro_preview", label: "Pro Preview" },
];

const VIS_OPTIONS: { value: FeatureVisibility; label: string }[] = [
  { value: "full", label: "Full" },
  { value: "lightweight", label: "Lightweight" },
  { value: "teaser", label: "Teaser" },
  { value: "hidden", label: "Hidden" },
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

type CellSource = "locked" | "draft" | "published" | "static";

interface Props {
  adminEmail: string;
  onPreviewDraft?: (variant: ReportVariant) => void;
  onOpenPublic?: (variant: ReportVariant) => void;
}

export function ModuleVisibilityMatrix({ adminEmail, onPreviewDraft, onOpenPublic }: Props) {
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
  const [confirmReset, setConfirmReset] = useState<ReportVariant | null>(null);

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
    } catch {
      toast.error("Erro ao carregar overrides.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Determine cell source ──────────────────────────────────────
  const getCellSource = (key: keyof VariantFeatures, variant: ReportVariant): CellSource => {
    if (isModuleLocked(key, variant)) return "locked";
    const localVal = localDrafts[variant]?.[key];
    if (localVal && localVal !== getVariantFeatures(variant)[key]) {
      return hasDraft(variant) || dirty[variant] ? "draft" : "published";
    }
    if (overrides[variant].published?.[key] !== undefined) return "published";
    return "static";
  };

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
      setConfirmReset(null);
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
      {/* Explanatory copy */}
      <div className="mx-4 mt-2 space-y-1.5">
        <div className="flex flex-wrap gap-3 text-[12px] text-admin-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            Draft — só afeta previews com <code className="rounded bg-white/20 px-1 admin-code">draft=true</code>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Publicado — afeta o relatório público real
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-2.5 w-2.5 text-admin-text-tertiary" />
            Locked — não pode ser alterado neste painel
          </span>
        </div>
      </div>

      {/* Publish confirmation dialog */}
      {confirmPublish && (
        <div className="mx-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">Isto altera o que utilizadores públicos veem.</p>
              <p className="mt-1 text-xs text-amber-600">
                A variante <strong>{confirmPublish}</strong> será atualizada. As alterações ficam visíveis imediatamente em <code className="rounded bg-amber-100 px-1 admin-code">/analyze/</code>.
              </p>
            </div>
          </div>
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

      {/* Reset confirmation dialog */}
      {confirmReset && (
        <div className="mx-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div>
              <p className="font-medium">Apagar todos os overrides de {confirmReset}?</p>
              <p className="mt-1 text-xs text-red-600">
                Isto remove o draft e o override publicado. O relatório público volta aos defaults estáticos definidos no código.
              </p>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => handleReset(confirmReset)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              <RotateCcw className="h-3 w-3" />
              Confirmar reset
            </button>
            <button
              onClick={() => setConfirmReset(null)}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
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
                    <VariantStatusBadges hasDraft={hasDraft(v.value)} hasPublished={hasPublished(v.value)} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureKeys.map((key) => {
              const anyLocked = VARIANTS.some((v) => isModuleLocked(key, v.value));
              return (
                <tr key={key} className="border-t border-white/10">
                  <td className="px-4 py-2 text-admin-text-primary">
                    <span className="flex items-center gap-1.5">
                      {FEATURE_LABELS[key]}
                      {anyLocked && <Lock className="h-3 w-3 text-admin-text-tertiary" />}
                    </span>
                  </td>
                  {VARIANTS.map((v) => {
                    const source = getCellSource(key, v.value);
                    const val = getDisplayValue(key, v.value);
                    const staticVal = getVariantFeatures(v.value)[key];

                    return (
                      <td key={v.value} className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          {source === "locked" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[12px] font-semibold uppercase text-gray-500">
                              <Lock className="h-2.5 w-2.5" />
                              {val}
                            </span>
                          ) : (
                            <select
                              value={val}
                              onChange={(e) => handleChange(key, v.value, e.target.value as FeatureVisibility)}
                              className={cn(
                                "rounded border px-2 py-1 text-[12px] font-medium",
                                source === "draft"
                                  ? "border-amber-300 bg-amber-50 text-amber-800"
                                  : source === "published"
                                    ? "border-green-300 bg-green-50 text-green-800"
                                    : "border-white/30 bg-white/50 text-admin-text-primary",
                              )}
                            >
                              {VIS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}{opt.value === staticVal ? " (default)" : ""}
                                </option>
                              ))}
                            </select>
                          )}
                          {source !== "locked" && source !== "static" && (
                            <CellSourceDot source={source} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action buttons per variant */}
      <div className="grid grid-cols-1 gap-4 px-4 pb-4 sm:grid-cols-3">
        {VARIANTS.map((v) => (
          <div key={v.value} className="rounded-lg border border-white/20 bg-white/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-admin-text-tertiary">
                {v.label}
              </span>
              <VariantStatusBadges hasDraft={hasDraft(v.value)} hasPublished={hasPublished(v.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleSaveDraft(v.value)}
                disabled={!dirty[v.value] || saving !== null}
                className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/50 px-2.5 py-1 text-[12px] font-medium text-admin-text-secondary hover:bg-white/70 disabled:opacity-40"
              >
                {saving === v.value ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Guardar draft
              </button>
              <button
                onClick={() => setConfirmPublish(v.value)}
                disabled={!hasDraft(v.value) && !dirty[v.value]}
                className="inline-flex items-center gap-1 rounded-lg border border-green-300 bg-green-50 px-2.5 py-1 text-[12px] font-medium text-green-700 hover:bg-green-100 disabled:opacity-40"
              >
                <Upload className="h-3 w-3" />
                Publicar
              </button>
              {onPreviewDraft && (
                <button
                  onClick={() => onPreviewDraft(v.value)}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-[12px] font-medium text-blue-700 hover:bg-blue-100"
                >
                  <Eye className="h-3 w-3" />
                  Preview draft
                </button>
              )}
              {onOpenPublic && v.value === "public_mvp" && (
                <button
                  onClick={() => onOpenPublic(v.value)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/50 px-2.5 py-1 text-[12px] font-medium text-admin-text-secondary hover:bg-white/70"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver público
                </button>
              )}
            </div>
            {(hasDraft(v.value) || hasPublished(v.value)) && (
              <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
                {hasDraft(v.value) && (
                  <button
                    onClick={() => handleDiscard(v.value)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-[12px] font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Descartar draft
                  </button>
                )}
                {hasPublished(v.value) && (
                  <button
                    onClick={() => setConfirmReset(v.value)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/30 px-2.5 py-1 text-[12px] font-medium text-admin-text-tertiary hover:bg-white/30"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset defaults
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────

function VariantStatusBadges({ hasDraft, hasPublished }: { hasDraft: boolean; hasPublished: boolean }) {
  return (
    <>
      {hasDraft && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">
          draft
        </span>
      )}
      {hasPublished && (
        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-700">
          publicado
        </span>
      )}
      {!hasDraft && !hasPublished && (
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500">
          defaults
        </span>
      )}
    </>
  );
}

function CellSourceDot({ source }: { source: CellSource }) {
  const cls = source === "draft"
    ? "bg-amber-400"
    : source === "published"
      ? "bg-green-500"
      : "bg-transparent";
  const title = source === "draft" ? "Valor de draft" : source === "published" ? "Override publicado" : "";
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", cls)} title={title} />;
}
