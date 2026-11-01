
CREATE POLICY "SP admins can upload course media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-media' AND public.is_sp_admin(auth.uid()));

CREATE POLICY "SP admins can update course media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'course-media' AND public.is_sp_admin(auth.uid()));

CREATE POLICY "SP admins can delete course media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'course-media' AND public.is_sp_admin(auth.uid()));
