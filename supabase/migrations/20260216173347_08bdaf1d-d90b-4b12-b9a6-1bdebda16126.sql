
-- Fix 1: Create a secure RPC for role changes with validation and audit logging
CREATE OR REPLACE FUNCTION public.change_user_role(
    p_target_user_id UUID,
    p_new_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_role app_role;
    v_old_role app_role;
BEGIN
    -- Get the calling user's role
    SELECT role INTO v_admin_role FROM user_roles WHERE user_id = auth.uid();
    
    -- Must be admin or higher to change roles
    IF v_admin_role IS NULL OR v_admin_role NOT IN ('superadmin', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: only admins can change roles';
    END IF;
    
    -- Only superadmin can create/modify superadmins
    IF p_new_role = 'superadmin' AND v_admin_role != 'superadmin' THEN
        RAISE EXCEPTION 'Only superadmins can assign the superadmin role';
    END IF;
    
    -- Get current role of target user
    SELECT role INTO v_old_role FROM user_roles WHERE user_id = p_target_user_id;
    
    -- Only superadmin can modify another superadmin
    IF v_old_role = 'superadmin' AND v_admin_role != 'superadmin' THEN
        RAISE EXCEPTION 'Only superadmins can modify superadmin accounts';
    END IF;
    
    -- Prevent last superadmin from being demoted
    IF v_old_role = 'superadmin' AND p_new_role != 'superadmin' THEN
        IF (SELECT COUNT(*) FROM user_roles WHERE role = 'superadmin') <= 1 THEN
            RAISE EXCEPTION 'Cannot demote the last superadmin';
        END IF;
    END IF;
    
    -- Prevent self-demotion for superadmins
    IF p_target_user_id = auth.uid() AND v_old_role = 'superadmin' AND p_new_role != 'superadmin' THEN
        RAISE EXCEPTION 'Cannot demote yourself from superadmin';
    END IF;
    
    -- Atomic update (or insert if no role exists)
    IF v_old_role IS NOT NULL THEN
        UPDATE user_roles SET role = p_new_role WHERE user_id = p_target_user_id;
    ELSE
        INSERT INTO user_roles (user_id, role) VALUES (p_target_user_id, p_new_role);
    END IF;
    
    -- Log the change
    PERFORM log_audit_event(
        'role_change',
        'user_role',
        p_target_user_id,
        jsonb_build_object('role', v_old_role::text),
        jsonb_build_object('role', p_new_role::text)
    );
END;
$$;

-- Fix 2: Fix overly permissive instructor assignment file access
DROP POLICY IF EXISTS "Instructors can view student assignment files" ON storage.objects;

CREATE POLICY "Instructors can view own course assignment files" 
ON storage.objects
FOR SELECT USING (
  bucket_id = 'assignments' AND
  EXISTS (
    SELECT 1 FROM assignment_submissions asub
    JOIN assignments a ON asub.assignment_id = a.id
    JOIN lessons l ON a.lesson_id = l.id
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE c.instructor_id = auth.uid()
    AND storage.objects.name LIKE '%' || asub.file_url || '%'
  )
);
