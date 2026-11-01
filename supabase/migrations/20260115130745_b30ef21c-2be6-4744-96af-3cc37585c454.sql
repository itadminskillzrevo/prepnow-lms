-- Create student_groups table for grouping students
CREATE TABLE public.student_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_group_members table
CREATE TABLE public.student_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.student_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create quiz_assignments table to track which quizzes are assigned to whom
CREATE TABLE public.quiz_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('all', 'batch', 'student', 'group')),
  target_id UUID, -- batch_id, user_id, or group_id based on assignment_type
  scheduled_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_assignments table to track which assignments are assigned to whom  
CREATE TABLE public.task_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('all', 'batch', 'student', 'group')),
  target_id UUID, -- batch_id, user_id, or group_id based on assignment_type
  scheduled_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_groups
CREATE POLICY "Admins can manage all groups" ON public.student_groups
  FOR ALL USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own course groups" ON public.student_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses c 
      WHERE c.id = student_groups.course_id 
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view groups they belong to" ON public.student_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_group_members sgm 
      WHERE sgm.group_id = student_groups.id 
      AND sgm.user_id = auth.uid()
    )
  );

-- RLS policies for student_group_members
CREATE POLICY "Admins can manage all group members" ON public.student_group_members
  FOR ALL USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage course group members" ON public.student_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM student_groups sg
      JOIN courses c ON sg.course_id = c.id
      WHERE sg.id = student_group_members.group_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own group membership" ON public.student_group_members
  FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for quiz_assignments
CREATE POLICY "Admins can manage all quiz assignments" ON public.quiz_assignments
  FOR ALL USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own quiz assignments" ON public.quiz_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN lessons l ON q.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE q.id = quiz_assignments.quiz_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view assigned quizzes" ON public.quiz_assignments
  FOR SELECT USING (
    is_active = true AND (
      assignment_type = 'all' OR
      (assignment_type = 'student' AND target_id = auth.uid()) OR
      (assignment_type = 'batch' AND EXISTS (
        SELECT 1 FROM batch_enrollments be 
        WHERE be.batch_id = quiz_assignments.target_id 
        AND be.user_id = auth.uid()
      )) OR
      (assignment_type = 'group' AND EXISTS (
        SELECT 1 FROM student_group_members sgm 
        WHERE sgm.group_id = quiz_assignments.target_id 
        AND sgm.user_id = auth.uid()
      ))
    )
  );

-- RLS policies for task_assignments
CREATE POLICY "Admins can manage all task assignments" ON public.task_assignments
  FOR ALL USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Instructors can manage own task assignments" ON public.task_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN lessons l ON a.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE a.id = task_assignments.assignment_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view assigned tasks" ON public.task_assignments
  FOR SELECT USING (
    is_active = true AND (
      assignment_type = 'all' OR
      (assignment_type = 'student' AND target_id = auth.uid()) OR
      (assignment_type = 'batch' AND EXISTS (
        SELECT 1 FROM batch_enrollments be 
        WHERE be.batch_id = task_assignments.target_id 
        AND be.user_id = auth.uid()
      )) OR
      (assignment_type = 'group' AND EXISTS (
        SELECT 1 FROM student_group_members sgm 
        WHERE sgm.group_id = task_assignments.target_id 
        AND sgm.user_id = auth.uid()
      ))
    )
  );