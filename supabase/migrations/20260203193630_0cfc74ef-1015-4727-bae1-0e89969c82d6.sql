-- Create a function to safely delete a course and all its related data
CREATE OR REPLACE FUNCTION delete_course_cascade(p_course_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete course analytics
  DELETE FROM public.course_analytics WHERE course_id = p_course_id;
  
  -- Delete course categories
  DELETE FROM public.course_categories WHERE course_id = p_course_id;
  
  -- Delete calendar events related to the course
  DELETE FROM public.calendar_events WHERE course_id = p_course_id;
  
  -- Delete live class schedules
  DELETE FROM public.live_class_schedules WHERE course_id = p_course_id;
  
  -- Delete live classes
  DELETE FROM public.live_classes WHERE course_id = p_course_id;
  
  -- Delete enrollments
  DELETE FROM public.enrollments WHERE course_id = p_course_id;
  
  -- Delete student groups related to the course
  DELETE FROM public.student_group_members WHERE group_id IN (
    SELECT id FROM public.student_groups WHERE course_id = p_course_id
  );
  DELETE FROM public.student_groups WHERE course_id = p_course_id;
  
  -- Delete batches and related data
  DELETE FROM public.batch_enrollments WHERE batch_id IN (
    SELECT id FROM public.batches WHERE course_id = p_course_id
  );
  DELETE FROM public.batch_curriculum WHERE batch_id IN (
    SELECT id FROM public.batches WHERE course_id = p_course_id
  );
  DELETE FROM public.google_drive_attachments WHERE entity_type = 'batch' AND entity_id IN (
    SELECT id FROM public.batches WHERE course_id = p_course_id
  );
  DELETE FROM public.batches WHERE course_id = p_course_id;
  
  -- Finally, delete the course itself
  DELETE FROM public.courses WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;