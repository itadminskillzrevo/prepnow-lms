
-- Create public storage bucket for Jr lesson videos and materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('jr-media', 'jr-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for jr-media
DROP POLICY IF EXISTS "Public read jr-media" ON storage.objects;
CREATE POLICY "Public read jr-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'jr-media');

-- Authenticated users can upload (admin UI is gated separately)
DROP POLICY IF EXISTS "Authenticated upload jr-media" ON storage.objects;
CREATE POLICY "Authenticated upload jr-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'jr-media');

DROP POLICY IF EXISTS "Authenticated update jr-media" ON storage.objects;
CREATE POLICY "Authenticated update jr-media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'jr-media');

DROP POLICY IF EXISTS "Authenticated delete jr-media" ON storage.objects;
CREATE POLICY "Authenticated delete jr-media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'jr-media');
