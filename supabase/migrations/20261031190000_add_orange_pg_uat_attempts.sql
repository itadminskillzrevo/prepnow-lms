CREATE TABLE public.orange_pg_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_txn_no text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('main', 'jr', 'selfpaced')),
  record_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'initiating'
    CHECK (status IN ('initiating', 'initiated', 'initiation_failed', 'pending', 'paid', 'failed')),
  tran_ctx text,
  response_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orange_pg_payment_attempts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.orange_pg_payment_attempts TO service_role;

CREATE INDEX orange_pg_payment_attempts_user_created_idx
  ON public.orange_pg_payment_attempts (user_id, created_at DESC);
