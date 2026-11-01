
-- ============================================================
-- Finance Management module
-- ============================================================

-- Invoice number sequence: SSPL{YYYY}-{6 digit}, starting at 270001
CREATE SEQUENCE IF NOT EXISTS public.finance_invoice_seq START WITH 270001 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY');
  v_seq  bigint := nextval('public.finance_invoice_seq');
BEGIN
  RETURN 'SSPL' || v_year || '-' || lpad(v_seq::text, 6, '0');
END;
$$;

-- ============================================================
-- finance_invoices  (one row per enrollment)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.finance_invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  text NOT NULL UNIQUE,
  enrollment_id   uuid NOT NULL UNIQUE REFERENCES public.enrollments(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  course_id       uuid NOT NULL,
  total_fees      numeric(12,2) NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'INR',
  invoice_date    timestamptz NOT NULL DEFAULT now(),
  enrollment_date timestamptz NOT NULL DEFAULT now(),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_invoices_user_idx   ON public.finance_invoices(user_id);
CREATE INDEX IF NOT EXISTS finance_invoices_course_idx ON public.finance_invoices(course_id);
CREATE INDEX IF NOT EXISTS finance_invoices_date_idx   ON public.finance_invoices(invoice_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_invoices TO authenticated;
GRANT ALL ON public.finance_invoices TO service_role;

ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;

-- SuperAdmin: full
CREATE POLICY "Finance invoices: superadmin all"
  ON public.finance_invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Admin: read only (no edit/delete; creation handled by trigger)
CREATE POLICY "Finance invoices: admin select"
  ON public.finance_invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- finance_payments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.finance_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES public.finance_invoices(id) ON DELETE CASCADE,
  amount          numeric(12,2) NOT NULL CHECK (amount >= 0),
  payment_method  text NOT NULL DEFAULT 'cash',
  reference_no    text,
  paid_on         timestamptz NOT NULL DEFAULT now(),
  notes           text,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_payments_invoice_idx ON public.finance_payments(invoice_id);
CREATE INDEX IF NOT EXISTS finance_payments_paid_idx    ON public.finance_payments(paid_on);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_payments TO authenticated;
GRANT ALL ON public.finance_payments TO service_role;

ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance payments: superadmin all"
  ON public.finance_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Finance payments: admin select"
  ON public.finance_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Finance payments: admin insert"
  ON public.finance_payments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Triggers
-- ============================================================

-- updated_at on invoices
CREATE TRIGGER finance_invoices_set_updated
  BEFORE UPDATE ON public.finance_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create invoice on enrollment
CREATE OR REPLACE FUNCTION public.create_finance_invoice_for_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric(12,2);
BEGIN
  SELECT COALESCE(price, 0) INTO v_price FROM public.courses WHERE id = NEW.course_id;

  INSERT INTO public.finance_invoices (
    invoice_number, enrollment_id, user_id, course_id,
    total_fees, currency, invoice_date, enrollment_date
  ) VALUES (
    public.generate_invoice_number(),
    NEW.id,
    NEW.user_id,
    NEW.course_id,
    COALESCE(v_price, 0),
    'INR',
    COALESCE(NEW.enrolled_at, now()),
    COALESCE(NEW.enrolled_at, now())
  )
  ON CONFLICT (enrollment_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enrollments_create_finance_invoice ON public.enrollments;
CREATE TRIGGER enrollments_create_finance_invoice
  AFTER INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.create_finance_invoice_for_enrollment();

-- ============================================================
-- Back-fill invoices for existing enrollments
-- ============================================================
INSERT INTO public.finance_invoices (
  invoice_number, enrollment_id, user_id, course_id,
  total_fees, currency, invoice_date, enrollment_date
)
SELECT
  public.generate_invoice_number(),
  e.id,
  e.user_id,
  e.course_id,
  COALESCE(c.price, 0),
  'INR',
  COALESCE(e.enrolled_at, now()),
  COALESCE(e.enrolled_at, now())
FROM public.enrollments e
JOIN public.courses c ON c.id = e.course_id
LEFT JOIN public.finance_invoices fi ON fi.enrollment_id = e.id
WHERE fi.id IS NULL;

-- Back-fill payments from existing enrollment.payment_amount if present
INSERT INTO public.finance_payments (invoice_id, amount, payment_method, reference_no, paid_on, notes)
SELECT
  fi.id,
  e.payment_amount,
  COALESCE(e.payment_method, 'online'),
  e.payment_id,
  COALESCE(e.payment_date, e.enrolled_at, now()),
  'Imported from enrollment'
FROM public.enrollments e
JOIN public.finance_invoices fi ON fi.enrollment_id = e.id
WHERE e.payment_amount IS NOT NULL AND e.payment_amount > 0
  AND NOT EXISTS (SELECT 1 FROM public.finance_payments p WHERE p.invoice_id = fi.id);

-- ============================================================
-- Stats helper (SECURITY DEFINER): aggregated finance numbers
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_finance_stats()
RETURNS TABLE (
  total_billing    numeric,
  total_collection numeric,
  total_due        numeric,
  total_students   bigint,
  today_collection numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH paid AS (
    SELECT invoice_id, COALESCE(SUM(amount), 0) AS paid_total,
           COALESCE(SUM(amount) FILTER (
             WHERE paid_on >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')
                                 AT TIME ZONE 'Asia/Kolkata'
           ), 0) AS today_paid
    FROM public.finance_payments
    GROUP BY invoice_id
  )
  SELECT
    COALESCE(SUM(i.total_fees), 0)                                   AS total_billing,
    COALESCE(SUM(COALESCE(p.paid_total, 0)), 0)                      AS total_collection,
    COALESCE(SUM(GREATEST(i.total_fees - COALESCE(p.paid_total, 0), 0)), 0) AS total_due,
    COUNT(DISTINCT i.user_id)                                        AS total_students,
    COALESCE(SUM(COALESCE(p.today_paid, 0)), 0)                      AS today_collection
  FROM public.finance_invoices i
  LEFT JOIN paid p ON p.invoice_id = i.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_stats() TO authenticated;
