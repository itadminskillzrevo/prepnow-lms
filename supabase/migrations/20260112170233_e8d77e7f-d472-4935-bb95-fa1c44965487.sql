-- Create batches table
CREATE TABLE public.batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  max_students INTEGER DEFAULT 50,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create batch_enrollments table
CREATE TABLE public.batch_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  UNIQUE(batch_id, user_id)
);

-- Create live_classes table
CREATE TABLE public.live_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  platform TEXT NOT NULL CHECK (platform IN ('google_meet', 'zoom')),
  meeting_url TEXT,
  meeting_id TEXT,
  host_id UUID NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendar_events table for unified calendar view
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('live_class', 'assignment', 'quiz', 'batch_start', 'batch_end', 'custom')),
  reference_id UUID,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  is_all_day BOOLEAN DEFAULT false,
  color TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Batches policies
CREATE POLICY "Anyone can view batches of published courses"
ON public.batches FOR SELECT
USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = batches.course_id AND courses.is_published = true));

CREATE POLICY "Admins can manage all batches"
ON public.batches FOR ALL
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own course batches"
ON public.batches FOR ALL
USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = batches.course_id AND courses.instructor_id = auth.uid()));

-- Batch enrollments policies
CREATE POLICY "Users can view own batch enrollments"
ON public.batch_enrollments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all batch enrollments"
ON public.batch_enrollments FOR ALL
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can view batch enrollments for their courses"
ON public.batch_enrollments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM batches b 
  JOIN courses c ON b.course_id = c.id 
  WHERE b.id = batch_enrollments.batch_id AND c.instructor_id = auth.uid()
));

-- Live classes policies
CREATE POLICY "Enrolled users can view live classes"
ON public.live_classes FOR SELECT
USING (
  EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = live_classes.course_id AND e.user_id = auth.uid() AND e.approval_status = 'approved')
  OR EXISTS (SELECT 1 FROM courses c WHERE c.id = live_classes.course_id AND c.instructor_id = auth.uid())
  OR is_admin_or_higher(auth.uid())
);

CREATE POLICY "Admins can manage all live classes"
ON public.live_classes FOR ALL
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own course live classes"
ON public.live_classes FOR ALL
USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = live_classes.course_id AND courses.instructor_id = auth.uid()));

-- Calendar events policies
CREATE POLICY "Users can view relevant calendar events"
ON public.calendar_events FOR SELECT
USING (
  course_id IS NULL
  OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = calendar_events.course_id AND e.user_id = auth.uid() AND e.approval_status = 'approved')
  OR EXISTS (SELECT 1 FROM courses c WHERE c.id = calendar_events.course_id AND c.instructor_id = auth.uid())
  OR is_admin_or_higher(auth.uid())
);

CREATE POLICY "Admins can manage all calendar events"
ON public.calendar_events FOR ALL
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own course calendar events"
ON public.calendar_events FOR ALL
USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = calendar_events.course_id AND courses.instructor_id = auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_batches_course_id ON public.batches(course_id);
CREATE INDEX idx_batches_status ON public.batches(status);
CREATE INDEX idx_batch_enrollments_batch_id ON public.batch_enrollments(batch_id);
CREATE INDEX idx_batch_enrollments_user_id ON public.batch_enrollments(user_id);
CREATE INDEX idx_live_classes_course_id ON public.live_classes(course_id);
CREATE INDEX idx_live_classes_scheduled_at ON public.live_classes(scheduled_at);
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_course_id ON public.calendar_events(course_id);

-- Create trigger for updated_at
CREATE TRIGGER update_batches_updated_at
BEFORE UPDATE ON public.batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_live_classes_updated_at
BEFORE UPDATE ON public.live_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();