CREATE TABLE public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  report_request_id uuid NOT NULL UNIQUE,
  usefulness_score smallint NOT NULL CHECK (usefulness_score BETWEEN 1 AND 5),
  clarity_text text,
  missing_text text,
  purchase_intent text NOT NULL CHECK (purchase_intent IN ('sim','talvez','nao')),
  pricing_preference text CHECK (pricing_preference IN ('one_off_3','bundle_5_13','plano_mensal','plano_agencia','nao_sei')),
  contact_consent boolean NOT NULL DEFAULT false,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_beta_feedback_lead ON public.beta_feedback(lead_id);