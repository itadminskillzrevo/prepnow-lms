
-- Add sub_modules support and materials for jr curriculum
CREATE TABLE IF NOT EXISTS public.jr_sub_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.jr_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jr_sub_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view jr sub_modules of published courses" ON public.jr_sub_modules
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.jr_modules m
    JOIN public.jr_courses c ON c.id = m.course_id
    WHERE m.id = jr_sub_modules.module_id AND c.is_published = true
  ));

CREATE POLICY "Jr admins manage jr sub_modules" ON public.jr_sub_modules
  FOR ALL USING (is_jr_admin(auth.uid())) WITH CHECK (is_jr_admin(auth.uid()));

CREATE TRIGGER trg_jr_sub_modules_updated BEFORE UPDATE ON public.jr_sub_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow lessons to belong to either a module or a sub_module
ALTER TABLE public.jr_lessons ADD COLUMN IF NOT EXISTS sub_module_id UUID REFERENCES public.jr_sub_modules(id) ON DELETE CASCADE;
ALTER TABLE public.jr_lessons ALTER COLUMN module_id DROP NOT NULL;

-- Course materials for lessons
CREATE TABLE IF NOT EXISTS public.jr_course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.jr_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jr_course_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view jr materials of published courses" ON public.jr_course_materials
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.jr_lessons l
    LEFT JOIN public.jr_modules m ON m.id = l.module_id
    LEFT JOIN public.jr_sub_modules sm ON sm.id = l.sub_module_id
    LEFT JOIN public.jr_modules m2 ON m2.id = sm.module_id
    JOIN public.jr_courses c ON c.id = COALESCE(m.course_id, m2.course_id)
    WHERE l.id = jr_course_materials.lesson_id AND c.is_published = true
  ));

CREATE POLICY "Jr admins manage jr materials" ON public.jr_course_materials
  FOR ALL USING (is_jr_admin(auth.uid())) WITH CHECK (is_jr_admin(auth.uid()));
