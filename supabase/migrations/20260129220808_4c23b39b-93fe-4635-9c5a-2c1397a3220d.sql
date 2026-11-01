-- Create categories table
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course_categories junction table for many-to-many relationship
CREATE TABLE public.course_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(course_id, category_id)
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories"
ON public.categories
FOR SELECT
USING (is_active = true);

-- Admins can manage all categories
CREATE POLICY "Admins can manage all categories"
ON public.categories
FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- Enable RLS on course_categories
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view course categories for published courses
CREATE POLICY "Anyone can view course categories"
ON public.course_categories
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = course_categories.course_id 
    AND courses.is_published = true
));

-- Admins can manage all course categories
CREATE POLICY "Admins can manage all course categories"
ON public.course_categories
FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- Instructors can manage their own course categories
CREATE POLICY "Instructors can manage own course categories"
ON public.course_categories
FOR ALL
USING (EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = course_categories.course_id 
    AND courses.instructor_id = auth.uid()
));

-- Insert default categories
INSERT INTO public.categories (name, description, order_index) VALUES
    ('Generative AI', 'Learn about generative AI models, prompt engineering, and AI content creation', 1),
    ('AI & Machine Learning', 'Master artificial intelligence and machine learning algorithms', 2),
    ('Data Science & Analytics', 'Explore data analysis, visualization, and statistical methods', 3),
    ('Business Intelligence', 'Learn BI tools, dashboards, and data-driven decision making', 4),
    ('Cybersecurity', 'Understand security principles, ethical hacking, and threat prevention', 5),
    ('Cloud & DevOps', 'Master cloud platforms, CI/CD pipelines, and infrastructure automation', 6);

-- Add trigger for updated_at
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();