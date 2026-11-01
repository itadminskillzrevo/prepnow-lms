-- Create sub_modules table for explicit hierarchy between modules and lessons
CREATE TABLE IF NOT EXISTS public.sub_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add sub_module_id to lessons table if not exists
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS sub_module_id UUID REFERENCES public.sub_modules(id) ON DELETE SET NULL;

-- Update curriculums table to add status field
ALTER TABLE public.curriculums ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Update modules table - make course_id nullable since modules now belong to curriculum
ALTER TABLE public.modules ALTER COLUMN course_id DROP NOT NULL;

-- Ensure batches curriculum_id has proper foreign key
ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS batches_curriculum_id_fkey;
ALTER TABLE public.batches ADD CONSTRAINT batches_curriculum_id_fkey 
  FOREIGN KEY (curriculum_id) REFERENCES public.curriculums(id) ON DELETE SET NULL;

-- Add curriculum_id foreign key back to courses
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_curriculum_id_fkey;
ALTER TABLE public.courses ADD CONSTRAINT courses_curriculum_id_fkey 
  FOREIGN KEY (curriculum_id) REFERENCES public.curriculums(id) ON DELETE SET NULL;

-- Add foreign key for modules to curriculum
ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_curriculum_id_fkey;
ALTER TABLE public.modules ADD CONSTRAINT modules_curriculum_id_fkey 
  FOREIGN KEY (curriculum_id) REFERENCES public.curriculums(id) ON DELETE CASCADE;

-- Enable RLS on sub_modules
ALTER TABLE public.sub_modules ENABLE ROW LEVEL SECURITY;

-- RLS policies for sub_modules
DROP POLICY IF EXISTS "Admins can manage all sub_modules" ON public.sub_modules;
CREATE POLICY "Admins can manage all sub_modules" ON public.sub_modules
  FOR ALL USING (is_admin_or_higher(auth.uid()));

DROP POLICY IF EXISTS "Instructors can manage own curriculum sub_modules" ON public.sub_modules;
CREATE POLICY "Instructors can manage own curriculum sub_modules" ON public.sub_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN curriculums c ON m.curriculum_id = c.id
      WHERE m.id = sub_modules.module_id AND c.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view sub_modules of published courses" ON public.sub_modules;
CREATE POLICY "Anyone can view sub_modules of published courses" ON public.sub_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN curriculums c ON m.curriculum_id = c.id
      JOIN courses co ON co.curriculum_id = c.id
      WHERE m.id = sub_modules.module_id AND co.is_published = true
    )
  );

-- Add trigger for updated_at on sub_modules
DROP TRIGGER IF EXISTS update_sub_modules_updated_at ON public.sub_modules;
CREATE TRIGGER update_sub_modules_updated_at
  BEFORE UPDATE ON public.sub_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add usage_count helper function
CREATE OR REPLACE FUNCTION public.get_curriculum_usage(p_curriculum_id UUID)
RETURNS TABLE(course_count BIGINT, batch_count BIGINT) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(*) FROM courses WHERE curriculum_id = p_curriculum_id),
    (SELECT COUNT(*) FROM batches WHERE curriculum_id = p_curriculum_id);
$$;