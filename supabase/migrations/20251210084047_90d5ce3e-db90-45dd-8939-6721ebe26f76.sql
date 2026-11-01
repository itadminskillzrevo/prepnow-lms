
-- Create assignments table
CREATE TABLE public.assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    max_score INTEGER DEFAULT 100,
    due_date TIMESTAMP WITH TIME ZONE,
    allow_late_submission BOOLEAN DEFAULT false,
    file_types_allowed TEXT[] DEFAULT ARRAY['pdf', 'doc', 'docx', 'txt'],
    max_file_size_mb INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    file_url TEXT,
    file_name TEXT,
    content TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'graded', 'returned', 'resubmit')),
    score INTEGER,
    feedback TEXT,
    graded_by UUID,
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit logs table
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user analytics table
CREATE TABLE public.user_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_spent_minutes INTEGER DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,
    quizzes_taken INTEGER DEFAULT 0,
    assignments_submitted INTEGER DEFAULT 0,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, date)
);

-- Create course analytics table
CREATE TABLE public.course_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    views INTEGER DEFAULT 0,
    enrollments INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    avg_progress DECIMAL(5,2) DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(course_id, date)
);

-- Create user preferences table for theme
CREATE TABLE public.user_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookmarks table
CREATE TABLE public.bookmarks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    timestamp_seconds INTEGER DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, lesson_id, timestamp_seconds)
);

-- Create notes table
CREATE TABLE public.lesson_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

-- Assignments policies
CREATE POLICY "Anyone can view assignments of published courses" ON public.assignments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM lessons l
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE l.id = assignments.lesson_id AND c.is_published = true
    )
);

CREATE POLICY "Instructors can manage own assignments" ON public.assignments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM lessons l
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE l.id = assignments.lesson_id AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage all assignments" ON public.assignments
FOR ALL USING (is_admin_or_higher(auth.uid()));

-- Submission policies
CREATE POLICY "Users can view own submissions" ON public.assignment_submissions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own submissions" ON public.assignment_submissions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending submissions" ON public.assignment_submissions
FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Instructors can view course submissions" ON public.assignment_submissions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN lessons l ON a.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE a.id = assignment_submissions.assignment_id AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY "Instructors can grade submissions" ON public.assignment_submissions
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN lessons l ON a.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE a.id = assignment_submissions.assignment_id AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all submissions" ON public.assignment_submissions
FOR SELECT USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can manage all submissions" ON public.assignment_submissions
FOR ALL USING (is_admin_or_higher(auth.uid()));

-- Audit logs policies (admin only)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (true);

-- User analytics policies
CREATE POLICY "Users can view own analytics" ON public.user_analytics
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics" ON public.user_analytics
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics" ON public.user_analytics
FOR SELECT USING (is_admin_or_higher(auth.uid()));

-- Course analytics policies
CREATE POLICY "Instructors can view own course analytics" ON public.course_analytics
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = course_analytics.course_id AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all course analytics" ON public.course_analytics
FOR SELECT USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "System can manage course analytics" ON public.course_analytics
FOR ALL USING (true);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON public.user_preferences
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences" ON public.user_preferences
FOR ALL USING (auth.uid() = user_id);

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
FOR ALL USING (auth.uid() = user_id);

-- Lesson notes policies
CREATE POLICY "Users can view own notes" ON public.lesson_notes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notes" ON public.lesson_notes
FOR ALL USING (auth.uid() = user_id);

-- Create storage bucket for assignments
INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('course-media', 'course-media', true);

-- Storage policies for assignments bucket
CREATE POLICY "Users can upload own assignment files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own assignment files" ON storage.objects
FOR SELECT USING (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Instructors can view student assignment files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'assignments' AND
    EXISTS (
        SELECT 1 FROM courses c
        WHERE c.instructor_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage all assignment files" ON storage.objects
FOR ALL USING (bucket_id = 'assignments' AND is_admin_or_higher(auth.uid()));

-- Storage policies for course-media bucket
CREATE POLICY "Anyone can view course media" ON storage.objects
FOR SELECT USING (bucket_id = 'course-media');

CREATE POLICY "Instructors can upload course media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'course-media' AND (has_role(auth.uid(), 'instructor') OR is_admin_or_higher(auth.uid())));

CREATE POLICY "Instructors can update own course media" ON storage.objects
FOR UPDATE USING (bucket_id = 'course-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can manage all course media" ON storage.objects
FOR ALL USING (bucket_id = 'course-media' AND is_admin_or_higher(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_analytics_updated_at BEFORE UPDATE ON public.user_analytics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_analytics_updated_at BEFORE UPDATE ON public.course_analytics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_notes_updated_at BEFORE UPDATE ON public.lesson_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_old_values, p_new_values)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;
