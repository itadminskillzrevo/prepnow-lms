-- =========================================================
-- jr_profiles
-- =========================================================
CREATE TABLE public.jr_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  grade text,
  school_name text,
  parent_name text,
  parent_phone text,
  parent_email text,
  city text,
  state text,
  date_of_birth date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jr_profiles ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_jr_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'jr_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_jr_student(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'jr_student');
$$;

CREATE POLICY "Jr students view own profile" ON public.jr_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Jr students update own profile" ON public.jr_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Jr students insert own profile" ON public.jr_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Jr admins manage all jr profiles" ON public.jr_profiles FOR ALL USING (public.is_jr_admin(auth.uid()));

-- jr_categories
CREATE TABLE public.jr_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  color text,
  order_index int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jr_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view active jr categories" ON public.jr_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Jr admins manage jr categories" ON public.jr_categories FOR ALL USING (public.is_jr_admin(auth.uid()));

-- jr_courses
CREATE TABLE public.jr_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  category_id uuid REFERENCES public.jr_categories(id) ON DELETE SET NULL,
  grade_level text,
  difficulty text DEFAULT 'beginner',
  duration_hours int DEFAULT 0,
  price numeric DEFAULT 0,
  is_published boolean DEFAULT false,
  what_you_will_learn text[] DEFAULT '{}',
  key_highlights text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jr_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view published jr courses" ON public.jr_courses FOR SELECT USING (is_published = true);
CREATE POLICY "Jr admins manage jr courses" ON public.jr_courses FOR ALL USING (public.is_jr_admin(auth.uid()));

-- jr_modules
CREATE TABLE public.jr_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.jr_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jr_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view jr modules of published courses" ON public.jr_modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jr_courses c WHERE c.id = course_id AND c.is_published = true));
CREATE POLICY "Jr admins manage jr modules" ON public.jr_modules FOR ALL USING (public.is_jr_admin(auth.uid()));

-- jr_lessons
CREATE TABLE public.jr_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.jr_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  video_url text,
  duration_minutes int DEFAULT 0,
  order_index int DEFAULT 0,
  is_free boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jr_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view jr lessons of published courses" ON public.jr_lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jr_modules m JOIN public.jr_courses c ON c.id = m.course_id
          WHERE m.id = module_id AND c.is_published = true));
CREATE POLICY "Jr admins manage jr lessons" ON public.jr_lessons FOR ALL USING (public.is_jr_admin(auth.uid()));

-- jr_enrollments
CREATE TABLE public.jr_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.jr_courses(id) ON DELETE CASCADE,
  status text DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, course_id)
);
ALTER TABLE public.jr_enrollments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_jr_enrolled(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.jr_enrollments WHERE user_id = _user_id AND course_id = _course_id);
$$;

CREATE POLICY "Jr students view own enrollments" ON public.jr_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Jr students enroll themselves" ON public.jr_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Jr admins manage all jr enrollments" ON public.jr_enrollments FOR ALL USING (public.is_jr_admin(auth.uid()));

-- jr_lesson_progress
CREATE TABLE public.jr_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.jr_lessons(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  progress_percent numeric DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE public.jr_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jr students manage own progress" ON public.jr_lesson_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Jr admins view all progress" ON public.jr_lesson_progress FOR SELECT USING (public.is_jr_admin(auth.uid()));

-- jr_quizzes
CREATE TABLE public.jr_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.jr_lessons(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.jr_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  passing_score int DEFAULT 70,
  time_limit_minutes int,
  max_attempts int DEFAULT 3,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jr_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled jr students view jr quizzes" ON public.jr_quizzes FOR SELECT USING (
  (course_id IS NOT NULL AND public.is_jr_enrolled(auth.uid(), course_id))
  OR (lesson_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.jr_lessons l JOIN public.jr_modules m ON m.id = l.module_id
    WHERE l.id = jr_quizzes.lesson_id AND public.is_jr_enrolled(auth.uid(), m.course_id)
  ))
);
CREATE POLICY "Jr admins manage jr quizzes" ON public.jr_quizzes FOR ALL USING (public.is_jr_admin(auth.uid()));

CREATE TABLE public.jr_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.jr_quizzes(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text DEFAULT 'multiple_choice',
  options jsonb,
  correct_answer text NOT NULL,
  points int DEFAULT 1,
  order_index int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jr_quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jr admins manage jr quiz questions" ON public.jr_quiz_questions FOR ALL USING (public.is_jr_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_jr_quiz_questions_for_student(p_quiz_id uuid)
RETURNS TABLE(id uuid, quiz_id uuid, question text, question_type text, options jsonb, points int, order_index int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.quiz_id, q.question, q.question_type, q.options, q.points, q.order_index
  FROM public.jr_quiz_questions q WHERE q.quiz_id = p_quiz_id ORDER BY q.order_index;
$$;

CREATE OR REPLACE FUNCTION public.check_jr_quiz_answers(p_quiz_id uuid, p_answers jsonb)
RETURNS TABLE(question_id uuid, is_correct boolean, correct_answer text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, (p_answers->>q.id::text) = q.correct_answer, q.correct_answer
  FROM public.jr_quiz_questions q WHERE q.quiz_id = p_quiz_id ORDER BY q.order_index;
$$;

CREATE TABLE public.jr_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.jr_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers jsonb,
  score int DEFAULT 0,
  max_score int DEFAULT 0,
  passed boolean DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.jr_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jr students manage own attempts" ON public.jr_quiz_attempts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Jr admins view all attempts" ON public.jr_quiz_attempts FOR SELECT USING (public.is_jr_admin(auth.uid()));

-- jr_assignments
CREATE TABLE public.jr_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.jr_lessons(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.jr_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  instructions text,
  max_score int DEFAULT 100,
  due_date timestamptz,
  allow_late_submission boolean DEFAULT false,
  file_types_allowed text[] DEFAULT ARRAY['pdf','doc','docx','txt','jpg','png'],
  max_file_size_mb int DEFAULT 10,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jr_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled jr students view jr assignments" ON public.jr_assignments FOR SELECT USING (
  (course_id IS NOT NULL AND public.is_jr_enrolled(auth.uid(), course_id))
  OR (lesson_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.jr_lessons l JOIN public.jr_modules m ON m.id = l.module_id
    WHERE l.id = jr_assignments.lesson_id AND public.is_jr_enrolled(auth.uid(), m.course_id)
  ))
);
CREATE POLICY "Jr admins manage jr assignments" ON public.jr_assignments FOR ALL USING (public.is_jr_admin(auth.uid()));

CREATE TABLE public.jr_assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.jr_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text,
  file_url text,
  file_name text,
  status text DEFAULT 'pending',
  score int,
  feedback text,
  graded_by uuid,
  graded_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jr_assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jr students manage own submissions" ON public.jr_assignment_submissions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Jr admins manage all jr submissions" ON public.jr_assignment_submissions FOR ALL
  USING (public.is_jr_admin(auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_jr_profiles_updated BEFORE UPDATE ON public.jr_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jr_categories_updated BEFORE UPDATE ON public.jr_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jr_courses_updated BEFORE UPDATE ON public.jr_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jr_modules_updated BEFORE UPDATE ON public.jr_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jr_lessons_updated BEFORE UPDATE ON public.jr_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jr_lesson_progress_updated BEFORE UPDATE ON public.jr_lesson_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jr_quizzes_updated BEFORE UPDATE ON public.jr_quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jr_assignments_updated BEFORE UPDATE ON public.jr_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jr_assignment_submissions_updated BEFORE UPDATE ON public.jr_assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user to support jr signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE((NEW.raw_user_meta_data->>'is_jr')::boolean, false) THEN
    INSERT INTO public.jr_profiles (user_id, email, full_name, grade, school_name)
    VALUES (
      NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name',''),
      NEW.raw_user_meta_data->>'grade',
      NEW.raw_user_meta_data->>'school_name'
    );
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'jr_student');
  ELSE
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  END IF;
  RETURN NEW;
END;
$$;