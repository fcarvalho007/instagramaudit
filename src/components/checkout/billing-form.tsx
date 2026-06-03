export interface BillingValue {
  name: string;
  tax_id: string;
  address: string;
  postal_code: string;
  city: string;
  invoice_email: string;
}

export const EMPTY_BILLING: BillingValue = {
  name: "",
  tax_id: "",
  address: "",
  postal_code: "",
  city: "",
  invoice_email: "",
};

export interface BillingErrors {
  name?: string;
  tax_id?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  invoice_email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIF_RE = /^\d{9}$/;
const POSTAL_RE = /^\d{4}-?\d{3}$/;

export function validateBilling(v: BillingValue): BillingErrors {
  const errors: BillingErrors = {};
  if (!v.name.trim()) errors.name = "Indica o nome ou empresa.";
  if (!v.address.trim()) errors.address = "Indica a morada.";
  if (!v.city.trim()) errors.city = "Indica a localidade.";
  if (!v.postal_code.trim()) {
    errors.postal_code = "Indica o código postal.";
  } else if (!POSTAL_RE.test(v.postal_code.trim())) {
    errors.postal_code = "Formato esperado: 1234-567.";
  }
  if (!v.invoice_email.trim()) {
    errors.invoice_email = "Indica o email de facturação.";
  } else if (!EMAIL_RE.test(v.invoice_email.trim())) {
    errors.invoice_email = "Email inválido.";
  }
  if (v.tax_id.trim() && !NIF_RE.test(v.tax_id.trim())) {
    errors.tax_id = "NIF deve ter 9 dígitos.";
  }
  return errors;
}

interface Props {
  value: BillingValue;
  onChange: (next: BillingValue) => void;
  errors: BillingErrors;
}

export function BillingForm({ value, onChange, errors }: Props) {
  const set = <K extends keyof BillingValue>(k: K, v: string) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <Field
        label="Nome ou empresa"
        value={value.name}
        onChange={(v) => set("name", v)}
        error={errors.name}
        autoComplete="organization"
      />
      <Field
        label="NIF (opcional)"
        value={value.tax_id}
        onChange={(v) => set("tax_id", v)}
        error={errors.tax_id}
        inputMode="numeric"
        autoComplete="off"
      />
      <Field
        label="Morada"
        value={value.address}
        onChange={(v) => set("address", v)}
        error={errors.address}
        autoComplete="street-address"
      />
      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4">
        <Field
          label="Código postal"
          value={value.postal_code}
          onChange={(v) => set("postal_code", v)}
          error={errors.postal_code}
          placeholder="1234-567"
          autoComplete="postal-code"
          inputMode="numeric"
        />
        <Field
          label="Localidade"
          value={value.city}
          onChange={(v) => set("city", v)}
          error={errors.city}
          autoComplete="address-level2"
        />
      </div>
      <Field
        label="Email para factura"
        type="email"
        value={value.invoice_email}
        onChange={(v) => set("invoice_email", v)}
        error={errors.invoice_email}
        autoComplete="email"
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email";
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-content-secondary mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-default bg-white px-3 py-2.5 text-base text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary"
      />
      {error ? (
        <span className="mt-1 block text-xs text-signal-error">{error}</span>
      ) : null}
    </label>
  );
}