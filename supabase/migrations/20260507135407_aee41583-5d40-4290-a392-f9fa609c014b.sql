
ALTER TABLE public.jr_assignments ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.jr_assignments ADD COLUMN IF NOT EXISTS file_name TEXT;
