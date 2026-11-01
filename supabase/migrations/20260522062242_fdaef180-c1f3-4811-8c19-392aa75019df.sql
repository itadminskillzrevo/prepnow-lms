CREATE POLICY "Admins can delete enrollments"
ON public.enrollments
FOR DELETE
USING (is_admin_or_higher(auth.uid()));