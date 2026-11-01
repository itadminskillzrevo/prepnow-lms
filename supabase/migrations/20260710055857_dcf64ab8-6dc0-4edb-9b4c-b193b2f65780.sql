-- Auto-generate order_number so sp-create-order insert doesn't fail
ALTER TABLE public.selfpaced_orders
  ALTER COLUMN order_number SET DEFAULT public.generate_sp_order_number();

-- Backfill any NULLs just in case
UPDATE public.selfpaced_orders SET order_number = public.generate_sp_order_number()
 WHERE order_number IS NULL OR order_number = '';