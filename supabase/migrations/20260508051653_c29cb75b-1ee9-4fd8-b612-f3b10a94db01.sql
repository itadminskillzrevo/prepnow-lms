
DROP POLICY "Jr admins manage jr assignments" ON public.jr_assignments;
CREATE POLICY "Jr admins manage jr assignments" ON public.jr_assignments
  FOR ALL TO authenticated
  USING (public.is_jr_admin(auth.uid()))
  WITH CHECK (public.is_jr_admin(auth.uid()));
