CREATE TABLE public.email_access_tokens (
  jti TEXT NOT NULL PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.email_access_tokens TO service_role;

ALTER TABLE public.email_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_access_tokens_expires_at ON public.email_access_tokens (expires_at);