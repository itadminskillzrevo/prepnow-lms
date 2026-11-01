ALTER TABLE public.quiz_assignments DROP CONSTRAINT quiz_assignments_assignment_type_check;
ALTER TABLE public.quiz_assignments ADD CONSTRAINT quiz_assignments_assignment_type_check CHECK (assignment_type = ANY (ARRAY['all'::text, 'batch'::text, 'student'::text, 'group'::text, 'course'::text]));

ALTER TABLE public.task_assignments DROP CONSTRAINT task_assignments_assignment_type_check;
ALTER TABLE public.task_assignments ADD CONSTRAINT task_assignments_assignment_type_check CHECK (assignment_type = ANY (ARRAY['all'::text, 'batch'::text, 'student'::text, 'group'::text, 'course'::text]));