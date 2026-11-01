-- Create question_categories table for organizing questions by subject/category
CREATE TABLE public.question_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.question_categories(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create question_bank table for storing reusable questions
CREATE TABLE public.question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.question_categories(id) ON DELETE SET NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'assignment')),
  question TEXT NOT NULL,
  options JSONB, -- For multiple choice options
  correct_answer TEXT, -- For auto-gradable questions
  points INTEGER DEFAULT 1,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  explanation TEXT, -- Explanation for the correct answer
  tags TEXT[], -- Additional tags for filtering
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create batch_curriculum table for batch-specific curriculum additions
CREATE TABLE public.batch_curriculum (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  is_additional BOOLEAN DEFAULT false, -- True if this is an additional module for this batch
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_curriculum ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_categories
CREATE POLICY "Admins can manage all categories"
  ON public.question_categories
  FOR ALL
  USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own categories"
  ON public.question_categories
  FOR ALL
  USING (auth.uid() = created_by);

CREATE POLICY "All authenticated users can view categories"
  ON public.question_categories
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for question_bank
CREATE POLICY "Admins can manage all questions"
  ON public.question_bank
  FOR ALL
  USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own questions"
  ON public.question_bank
  FOR ALL
  USING (auth.uid() = created_by);

CREATE POLICY "Instructors can view all active questions"
  ON public.question_bank
  FOR SELECT
  USING (is_active = true AND has_role(auth.uid(), 'instructor'));

-- RLS Policies for batch_curriculum
CREATE POLICY "Admins can manage all batch curriculum"
  ON public.batch_curriculum
  FOR ALL
  USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own batch curriculum"
  ON public.batch_curriculum
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM batches b
    JOIN courses c ON b.course_id = c.id
    WHERE b.id = batch_curriculum.batch_id AND c.instructor_id = auth.uid()
  ));

CREATE POLICY "Enrolled students can view batch curriculum"
  ON public.batch_curriculum
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM batch_enrollments be
    WHERE be.batch_id = batch_curriculum.batch_id AND be.user_id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX idx_question_bank_category ON public.question_bank(category_id);
CREATE INDEX idx_question_bank_type ON public.question_bank(question_type);
CREATE INDEX idx_question_bank_difficulty ON public.question_bank(difficulty);
CREATE INDEX idx_question_bank_tags ON public.question_bank USING GIN(tags);
CREATE INDEX idx_batch_curriculum_batch ON public.batch_curriculum(batch_id);

-- Add triggers for updated_at
CREATE TRIGGER update_question_categories_updated_at
  BEFORE UPDATE ON public.question_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_question_bank_updated_at
  BEFORE UPDATE ON public.question_bank
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();