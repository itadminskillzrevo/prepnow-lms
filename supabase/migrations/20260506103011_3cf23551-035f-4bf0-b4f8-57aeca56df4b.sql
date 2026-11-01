
-- Create storage bucket for jr assignments
INSERT INTO storage.buckets (id, name, public) VALUES ('jr-assignments', 'jr-assignments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for jr-assignments bucket
CREATE POLICY "jr_assignments_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'jr-assignments');

CREATE POLICY "jr_assignments_auth_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'jr-assignments' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "jr_assignments_auth_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'jr-assignments' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "jr_assignments_auth_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'jr-assignments' AND auth.uid()::text = (storage.foldername(name))[1]
);
