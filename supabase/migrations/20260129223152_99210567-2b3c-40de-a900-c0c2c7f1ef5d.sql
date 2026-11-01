-- Add new columns for course details
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS program_overview text,
ADD COLUMN IF NOT EXISTS key_highlights text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tools_covered text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS skills_developed text[] DEFAULT '{}';