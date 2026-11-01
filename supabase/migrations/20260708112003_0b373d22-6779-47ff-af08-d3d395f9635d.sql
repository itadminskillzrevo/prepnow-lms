
CREATE OR REPLACE FUNCTION public.is_sp_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id=_user_id AND role IN ('sp_admin','admin','superadmin'));
$$;
CREATE OR REPLACE FUNCTION public.is_sp_student(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='sp_student');
$$;
CREATE OR REPLACE FUNCTION public.is_sp_enrolled(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_exists boolean;
BEGIN
  EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.selfpaced_enrollments WHERE user_id=$1 AND course_id=$2)'
    INTO v_exists USING _user_id, _course_id;
  RETURN v_exists;
END; $$;
REVOKE EXECUTE ON FUNCTION public.is_sp_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_sp_student(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_sp_enrolled(uuid,uuid) FROM anon;

CREATE TABLE public.selfpaced_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, email text NOT NULL,
  full_name text NOT NULL DEFAULT '', phone text, avatar_url text,
  address text, city text, state text, pincode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_profiles TO authenticated;
GRANT ALL ON public.selfpaced_profiles TO service_role;
ALTER TABLE public.selfpaced_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_prof_own" ON public.selfpaced_profiles FOR ALL TO authenticated
  USING (user_id=auth.uid() OR public.is_sp_admin(auth.uid()))
  WITH CHECK (user_id=auth.uid() OR public.is_sp_admin(auth.uid()));

CREATE TABLE public.selfpaced_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text NOT NULL UNIQUE, description text,
  icon text, color text DEFAULT '#3b82f6',
  is_active boolean NOT NULL DEFAULT true, display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.selfpaced_categories TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_categories TO authenticated;
GRANT ALL ON public.selfpaced_categories TO service_role;
ALTER TABLE public.selfpaced_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_cat_read" ON public.selfpaced_categories FOR SELECT USING (true);
CREATE POLICY "sp_cat_admin" ON public.selfpaced_categories FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));

CREATE TABLE public.selfpaced_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, slug text UNIQUE, short_description text, description text,
  thumbnail_url text, preview_video_url text,
  category_id uuid REFERENCES public.selfpaced_categories(id) ON DELETE SET NULL,
  level text DEFAULT 'beginner', language text DEFAULT 'English',
  duration_hours numeric(6,2) DEFAULT 0,
  price numeric(10,2) NOT NULL DEFAULT 0,
  original_price numeric(10,2), currency text NOT NULL DEFAULT 'INR',
  what_you_will_learn text[] DEFAULT '{}', key_highlights text[] DEFAULT '{}',
  requirements text[] DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.selfpaced_courses TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_courses TO authenticated;
GRANT ALL ON public.selfpaced_courses TO service_role;
ALTER TABLE public.selfpaced_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_courses_public" ON public.selfpaced_courses FOR SELECT USING (is_published=true);
CREATE POLICY "sp_courses_admin" ON public.selfpaced_courses FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));
CREATE POLICY "sp_courses_enrolled" ON public.selfpaced_courses FOR SELECT TO authenticated
  USING (public.is_sp_enrolled(auth.uid(), id));

CREATE TABLE public.selfpaced_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.selfpaced_courses(id) ON DELETE CASCADE,
  title text NOT NULL, description text, order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.selfpaced_modules TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_modules TO authenticated;
GRANT ALL ON public.selfpaced_modules TO service_role;
ALTER TABLE public.selfpaced_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_mod_public" ON public.selfpaced_modules FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.selfpaced_courses c WHERE c.id=course_id AND c.is_published=true));
CREATE POLICY "sp_mod_admin" ON public.selfpaced_modules FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));
CREATE POLICY "sp_mod_enrolled" ON public.selfpaced_modules FOR SELECT TO authenticated
  USING (public.is_sp_enrolled(auth.uid(), course_id));

CREATE TABLE public.selfpaced_sub_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.selfpaced_modules(id) ON DELETE CASCADE,
  title text NOT NULL, description text, order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.selfpaced_sub_modules TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_sub_modules TO authenticated;
GRANT ALL ON public.selfpaced_sub_modules TO service_role;
ALTER TABLE public.selfpaced_sub_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_sm_read" ON public.selfpaced_sub_modules FOR SELECT USING (true);
CREATE POLICY "sp_sm_admin" ON public.selfpaced_sub_modules FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));

CREATE TABLE public.selfpaced_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.selfpaced_modules(id) ON DELETE CASCADE,
  sub_module_id uuid REFERENCES public.selfpaced_sub_modules(id) ON DELETE CASCADE,
  title text NOT NULL, description text,
  content_type text NOT NULL DEFAULT 'video',
  video_url text, content text, duration_minutes int DEFAULT 0,
  is_preview boolean NOT NULL DEFAULT false, order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.selfpaced_lessons TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_lessons TO authenticated;
GRANT ALL ON public.selfpaced_lessons TO service_role;
ALTER TABLE public.selfpaced_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_l_preview" ON public.selfpaced_lessons FOR SELECT USING (is_preview=true);
CREATE POLICY "sp_l_admin" ON public.selfpaced_lessons FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));
CREATE POLICY "sp_l_enrolled" ON public.selfpaced_lessons FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.selfpaced_modules m
    WHERE m.id=module_id AND public.is_sp_enrolled(auth.uid(), m.course_id)));

CREATE TABLE public.selfpaced_course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.selfpaced_courses(id) ON DELETE CASCADE,
  title text NOT NULL, file_url text NOT NULL, file_type text,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_course_materials TO authenticated;
GRANT ALL ON public.selfpaced_course_materials TO service_role;
ALTER TABLE public.selfpaced_course_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_mat_admin" ON public.selfpaced_course_materials FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));
CREATE POLICY "sp_mat_enrolled" ON public.selfpaced_course_materials FOR SELECT TO authenticated
  USING (public.is_sp_enrolled(auth.uid(), course_id));

CREATE TABLE public.selfpaced_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.selfpaced_courses(id) ON DELETE CASCADE,
  order_id uuid, progress_percentage numeric(5,2) NOT NULL DEFAULT 0,
  completed_at timestamptz,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_enrollments TO authenticated;
GRANT ALL ON public.selfpaced_enrollments TO service_role;
ALTER TABLE public.selfpaced_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_enr_read" ON public.selfpaced_enrollments FOR SELECT TO authenticated
  USING (user_id=auth.uid() OR public.is_sp_admin(auth.uid()));
CREATE POLICY "sp_enr_admin" ON public.selfpaced_enrollments FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));
CREATE POLICY "sp_enr_self_ins" ON public.selfpaced_enrollments FOR INSERT TO authenticated
  WITH CHECK (user_id=auth.uid());

-- Now replace is_sp_enrolled with direct SQL version (table now exists)
CREATE OR REPLACE FUNCTION public.is_sp_enrolled(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.selfpaced_enrollments
    WHERE user_id=_user_id AND course_id=_course_id);
$$;

CREATE TABLE public.selfpaced_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.selfpaced_lessons(id) ON DELETE CASCADE,
  is_completed boolean NOT NULL DEFAULT false,
  watch_time_seconds int DEFAULT 0, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_lesson_progress TO authenticated;
GRANT ALL ON public.selfpaced_lesson_progress TO service_role;
ALTER TABLE public.selfpaced_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_prog_own" ON public.selfpaced_lesson_progress FOR ALL TO authenticated
  USING (user_id=auth.uid() OR public.is_sp_admin(auth.uid()))
  WITH CHECK (user_id=auth.uid() OR public.is_sp_admin(auth.uid()));

CREATE TABLE public.selfpaced_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.selfpaced_courses(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_cart_items TO authenticated;
GRANT ALL ON public.selfpaced_cart_items TO service_role;
ALTER TABLE public.selfpaced_cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_cart_own" ON public.selfpaced_cart_items FOR ALL TO authenticated
  USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

CREATE TABLE public.selfpaced_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.selfpaced_courses(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_wishlist TO authenticated;
GRANT ALL ON public.selfpaced_wishlist TO service_role;
ALTER TABLE public.selfpaced_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_wish_own" ON public.selfpaced_wishlist FOR ALL TO authenticated
  USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

CREATE TABLE public.selfpaced_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending',
  razorpay_order_id text, razorpay_payment_id text, razorpay_signature text,
  coupon_code text, paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_orders TO authenticated;
GRANT ALL ON public.selfpaced_orders TO service_role;
ALTER TABLE public.selfpaced_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_ord_read" ON public.selfpaced_orders FOR SELECT TO authenticated
  USING (user_id=auth.uid() OR public.is_sp_admin(auth.uid()));
CREATE POLICY "sp_ord_ins" ON public.selfpaced_orders FOR INSERT TO authenticated
  WITH CHECK (user_id=auth.uid());
CREATE POLICY "sp_ord_upd" ON public.selfpaced_orders FOR UPDATE TO authenticated
  USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY "sp_ord_admin" ON public.selfpaced_orders FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));

CREATE TABLE public.selfpaced_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.selfpaced_orders(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.selfpaced_courses(id) ON DELETE RESTRICT,
  title text NOT NULL, price numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_order_items TO authenticated;
GRANT ALL ON public.selfpaced_order_items TO service_role;
ALTER TABLE public.selfpaced_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_oi_read" ON public.selfpaced_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.selfpaced_orders o WHERE o.id=order_id AND (o.user_id=auth.uid() OR public.is_sp_admin(auth.uid()))));
CREATE POLICY "sp_oi_ins" ON public.selfpaced_order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.selfpaced_orders o WHERE o.id=order_id AND o.user_id=auth.uid()));
CREATE POLICY "sp_oi_admin" ON public.selfpaced_order_items FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));

CREATE SEQUENCE IF NOT EXISTS public.selfpaced_order_seq START WITH 100001;
CREATE OR REPLACE FUNCTION public.generate_sp_order_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_year text := to_char(now() AT TIME ZONE 'Asia/Kolkata','YYYY');
        v_seq bigint := nextval('public.selfpaced_order_seq');
BEGIN RETURN 'SPO'||v_year||'-'||lpad(v_seq::text,6,'0'); END; $$;
REVOKE EXECUTE ON FUNCTION public.generate_sp_order_number() FROM anon;

CREATE TABLE public.selfpaced_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.selfpaced_courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.selfpaced_lessons(id) ON DELETE CASCADE,
  title text NOT NULL, description text,
  passing_score int NOT NULL DEFAULT 60,
  time_limit_minutes int, max_attempts int DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_quizzes TO authenticated;
GRANT ALL ON public.selfpaced_quizzes TO service_role;
ALTER TABLE public.selfpaced_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_qz_admin" ON public.selfpaced_quizzes FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));
CREATE POLICY "sp_qz_enrolled" ON public.selfpaced_quizzes FOR SELECT TO authenticated
  USING (course_id IS NOT NULL AND public.is_sp_enrolled(auth.uid(), course_id));

CREATE TABLE public.selfpaced_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.selfpaced_quizzes(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  options jsonb, correct_answer text NOT NULL,
  points int NOT NULL DEFAULT 1, order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_quiz_questions TO authenticated;
GRANT ALL ON public.selfpaced_quiz_questions TO service_role;
ALTER TABLE public.selfpaced_quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_qq_admin" ON public.selfpaced_quiz_questions FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_sp_quiz_questions_for_student(p_quiz_id uuid)
RETURNS TABLE(id uuid, quiz_id uuid, question text, question_type text, options jsonb, points int, order_index int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT q.id,q.quiz_id,q.question,q.question_type,q.options,q.points,q.order_index
  FROM public.selfpaced_quiz_questions q WHERE q.quiz_id=p_quiz_id ORDER BY q.order_index; $$;
CREATE OR REPLACE FUNCTION public.check_sp_quiz_answers(p_quiz_id uuid, p_answers jsonb)
RETURNS TABLE(question_id uuid, is_correct boolean, correct_answer text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT q.id,(p_answers->>q.id::text)=q.correct_answer,q.correct_answer
  FROM public.selfpaced_quiz_questions q WHERE q.quiz_id=p_quiz_id ORDER BY q.order_index; $$;
REVOKE EXECUTE ON FUNCTION public.get_sp_quiz_questions_for_student(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_sp_quiz_answers(uuid,jsonb) FROM anon;

CREATE TABLE public.selfpaced_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quiz_id uuid NOT NULL REFERENCES public.selfpaced_quizzes(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric(5,2), passed boolean,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_quiz_attempts TO authenticated;
GRANT ALL ON public.selfpaced_quiz_attempts TO service_role;
ALTER TABLE public.selfpaced_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_qa_own" ON public.selfpaced_quiz_attempts FOR ALL TO authenticated
  USING (user_id=auth.uid() OR public.is_sp_admin(auth.uid()))
  WITH CHECK (user_id=auth.uid() OR public.is_sp_admin(auth.uid()));

CREATE TABLE public.selfpaced_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.selfpaced_courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.selfpaced_lessons(id) ON DELETE CASCADE,
  title text NOT NULL, description text, instructions text,
  max_points int NOT NULL DEFAULT 100, due_date timestamptz,
  is_active boolean NOT NULL DEFAULT true, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_assignments TO authenticated;
GRANT ALL ON public.selfpaced_assignments TO service_role;
ALTER TABLE public.selfpaced_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_as_admin" ON public.selfpaced_assignments FOR ALL TO authenticated
  USING (public.is_sp_admin(auth.uid())) WITH CHECK (public.is_sp_admin(auth.uid()));
CREATE POLICY "sp_as_enrolled" ON public.selfpaced_assignments FOR SELECT TO authenticated
  USING (course_id IS NOT NULL AND public.is_sp_enrolled(auth.uid(), course_id));

CREATE TABLE public.selfpaced_assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.selfpaced_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  submission_text text, file_url text, file_name text,
  status text NOT NULL DEFAULT 'submitted',
  score numeric(6,2), feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz, graded_by uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.selfpaced_assignment_submissions TO authenticated;
GRANT ALL ON public.selfpaced_assignment_submissions TO service_role;
ALTER TABLE public.selfpaced_assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_sub_own" ON public.selfpaced_assignment_submissions FOR ALL TO authenticated
  USING (user_id=auth.uid() OR public.is_sp_admin(auth.uid()))
  WITH CHECK (user_id=auth.uid() OR public.is_sp_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF COALESCE((NEW.raw_user_meta_data->>'is_selfpaced')::boolean,false) THEN
    INSERT INTO public.selfpaced_profiles (user_id,email,full_name,phone)
    VALUES (NEW.id,NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name',''),
      NEW.raw_user_meta_data->>'phone');
    INSERT INTO public.user_roles (user_id,role) VALUES (NEW.id,'sp_student');
  ELSIF COALESCE((NEW.raw_user_meta_data->>'is_jr')::boolean,false) THEN
    INSERT INTO public.jr_profiles (user_id,email,full_name,grade,school_name)
    VALUES (NEW.id,NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name',''),
      NEW.raw_user_meta_data->>'grade',
      NEW.raw_user_meta_data->>'school_name');
    INSERT INTO public.user_roles (user_id,role) VALUES (NEW.id,'jr_student');
  ELSE
    INSERT INTO public.profiles (user_id,email,full_name)
    VALUES (NEW.id,NEW.email,COALESCE(NEW.raw_user_meta_data->>'full_name',''));
    INSERT INTO public.user_roles (user_id,role) VALUES (NEW.id,'student');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER sp_prof_uat BEFORE UPDATE ON public.selfpaced_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sp_cat_uat BEFORE UPDATE ON public.selfpaced_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sp_c_uat BEFORE UPDATE ON public.selfpaced_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sp_m_uat BEFORE UPDATE ON public.selfpaced_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sp_sm_uat BEFORE UPDATE ON public.selfpaced_sub_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sp_l_uat BEFORE UPDATE ON public.selfpaced_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sp_e_uat BEFORE UPDATE ON public.selfpaced_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sp_p_uat BEFORE UPDATE ON public.selfpaced_lesson_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sp_o_uat BEFORE UPDATE ON public.selfpaced_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sp_qz_uat BEFORE UPDATE ON public.selfpaced_quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sp_as_uat BEFORE UPDATE ON public.selfpaced_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
