-- Create curriculums table to make curriculum an independent entity
CREATE TABLE public.curriculums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add curriculum_id to courses table (optional - course can have a curriculum)
ALTER TABLE public.courses ADD COLUMN curriculum_id UUID REFERENCES public.curriculums(id) ON DELETE SET NULL;

-- Add curriculum_id to batches table (optional - batch can have its own curriculum)
ALTER TABLE public.batches ADD COLUMN curriculum_id UUID REFERENCES public.curriculums(id) ON DELETE SET NULL;

-- Add curriculum_id to modules table (modules now belong to a curriculum, not directly to a course)
ALTER TABLE public.modules ADD COLUMN curriculum_id UUID REFERENCES public.curriculums(id) ON DELETE CASCADE;

-- Enable RLS on curriculums
ALTER TABLE public.curriculums ENABLE ROW LEVEL SECURITY;

-- RLS Policies for curriculums
CREATE POLICY "Admins can manage all curriculums" 
ON public.curriculums FOR ALL 
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own curriculums" 
ON public.curriculums FOR ALL 
USING (auth.uid() = created_by);

CREATE POLICY "Anyone can view curriculums of published courses" 
ON public.curriculums FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.curriculum_id = curriculums.id 
        AND courses.is_published = true
    )
    OR EXISTS (
        SELECT 1 FROM batches b
        JOIN courses c ON b.course_id = c.id
        WHERE b.curriculum_id = curriculums.id 
        AND c.is_published = true
    )
    OR auth.uid() = created_by
    OR is_admin_or_higher(auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_curriculums_updated_at
BEFORE UPDATE ON public.curriculums
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();