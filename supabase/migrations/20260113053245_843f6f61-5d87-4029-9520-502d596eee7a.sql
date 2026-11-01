-- Create a function to schedule live class notifications
CREATE OR REPLACE FUNCTION public.schedule_live_class_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create calendar event for the live class
  INSERT INTO calendar_events (
    title,
    description,
    event_type,
    start_time,
    end_time,
    course_id,
    batch_id,
    reference_id,
    created_by,
    color
  ) VALUES (
    NEW.title,
    NEW.description,
    'live_class',
    NEW.scheduled_at,
    NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::interval,
    NEW.course_id,
    NEW.batch_id,
    NEW.id,
    NEW.host_id,
    '#4F46E5'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for live class creation
DROP TRIGGER IF EXISTS on_live_class_created ON live_classes;
CREATE TRIGGER on_live_class_created
  AFTER INSERT ON live_classes
  FOR EACH ROW
  EXECUTE FUNCTION schedule_live_class_notification();

-- Create function to update calendar when live class is updated
CREATE OR REPLACE FUNCTION public.update_live_class_calendar()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE calendar_events
  SET 
    title = NEW.title,
    description = NEW.description,
    start_time = NEW.scheduled_at,
    end_time = NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::interval,
    batch_id = NEW.batch_id,
    updated_at = now()
  WHERE reference_id = NEW.id AND event_type = 'live_class';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for live class updates
DROP TRIGGER IF EXISTS on_live_class_updated ON live_classes;
CREATE TRIGGER on_live_class_updated
  AFTER UPDATE ON live_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_live_class_calendar();

-- Create a notifications queue table for scheduled notifications
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'reminder',
  link text,
  scheduled_for timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  reference_type text,
  reference_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on scheduled_notifications
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage scheduled notifications
CREATE POLICY "Admins can manage scheduled notifications"
  ON public.scheduled_notifications FOR ALL
  USING (is_admin_or_higher(auth.uid()));

-- Create policy for system to insert scheduled notifications
CREATE POLICY "System can insert scheduled notifications"
  ON public.scheduled_notifications FOR INSERT
  WITH CHECK (true);

-- Create index for efficient querying of pending notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending 
  ON scheduled_notifications(scheduled_for) 
  WHERE sent_at IS NULL;

-- Add batch_id to enrollments table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'enrollments' 
    AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE public.enrollments ADD COLUMN batch_id uuid REFERENCES batches(id);
  END IF;
END $$;