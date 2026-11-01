import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Calendar } from 'lucide-react';

interface WeeklyScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const WeeklyScheduleDialog: React.FC<WeeklyScheduleDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState('');
  const [targetType, setTargetType] = useState<'batch' | 'student' | 'all'>('batch');
  const [batchId, setBatchId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Fetch courses (all courses the user can see)
  const { data: courses } = useQuery({
    queryKey: ['courses-for-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  // Fetch batches for selected course
  const { data: batches } = useQuery({
    queryKey: ['batches-for-schedule', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from('batches')
        .select('id, name')
        .eq('course_id', courseId)
        .in('status', ['upcoming', 'active'])
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  // Fetch students for individual targeting
  const { data: students } = useQuery({
    queryKey: ['students-for-schedule', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      // First get enrolled user IDs
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('approval_status', 'approved');
      if (enrollError) throw enrollError;
      if (!enrollments || enrollments.length === 0) return [];

      const userIds = enrollments.map(e => e.user_id);
      // Then fetch their profiles separately
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      if (profileError) throw profileError;

      return (profiles || []).map(p => ({
        user_id: p.user_id,
        profiles: { full_name: p.full_name, email: p.email },
      }));
    },
    enabled: !!courseId && targetType === 'student',
  });

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!courseId || selectedDays.length === 0 || !title || !startTime) {
        throw new Error('Please fill in all required fields');
      }

      const schedules = selectedDays.map((dayOfWeek) => ({
        course_id: courseId,
        batch_id: targetType === 'batch' && batchId ? batchId : null,
        target_student_id: targetType === 'student' && studentId ? studentId : null,
        day_of_week: dayOfWeek,
        start_time: startTime,
        duration_minutes: duration,
        title,
        description: description || null,
        platform: 'google_meet',
        host_id: user?.id,
        is_active: true,
      }));

      const { error } = await supabase.from('live_class_schedules').insert(schedules);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-schedules'] });
      toast.success(`Weekly schedule created for ${selectedDays.length} day(s)`);
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setCourseId('');
    setTargetType('batch');
    setBatchId('');
    setStudentId('');
    setSelectedDays([]);
    setStartTime('10:00');
    setDuration(60);
    setTitle('');
    setDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createScheduleMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Weekly Schedule
          </DialogTitle>
          <DialogDescription>
            Set up a recurring weekly schedule for live classes. Classes will be auto-created with Google Meet links.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Selection */}
          <div className="space-y-2">
            <Label>Course *</Label>
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); setBatchId(''); setStudentId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Type */}
          <div className="space-y-2">
            <Label>Schedule For *</Label>
            <Select value={targetType} onValueChange={(v: 'batch' | 'student' | 'all') => setTargetType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Enrolled Students</SelectItem>
                <SelectItem value="batch">Specific Batch</SelectItem>
                <SelectItem value="student">Individual Student</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Batch Selection */}
          {targetType === 'batch' && courseId && batches && batches.length > 0 && (
            <div className="space-y-2">
              <Label>Batch *</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Student Selection */}
          {targetType === 'student' && courseId && (
            <div className="space-y-2">
              <Label>Student *</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students?.map((enrollment: any) => (
                    <SelectItem key={enrollment.user_id} value={enrollment.user_id}>
                      {enrollment.profiles?.full_name || enrollment.profiles?.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Class Title */}
          <div className="space-y-2">
            <Label>Class Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Review Session"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will be covered..."
              rows={2}
            />
          </div>

          {/* Day Selection */}
          <div className="space-y-2">
            <Label>Class Days *</Label>
            <div className="grid grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day.value}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                    {day.label.slice(0, 3)}
                  </Label>
                </div>
              ))}
            </div>
            {selectedDays.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')}
              </p>
            )}
          </div>

          {/* Time and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time (IST) *</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Time is in Indian Standard Time (IST)</p>
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={15}
                max={480}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createScheduleMutation.isPending || selectedDays.length === 0}>
              {createScheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
