import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Video, ExternalLink, Calendar, Clock, Loader2, CalendarDays, Wand2 } from 'lucide-react';
import { WeeklyScheduleDialog } from '@/components/live-class/WeeklyScheduleDialog';
import { ScheduleList } from '@/components/live-class/ScheduleList';

interface LiveClass {
  id: string;
  batch_id: string | null;
  course_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  platform: 'google_meet' | 'zoom';
  meeting_url: string | null;
  meeting_id: string | null;
  host_id: string;
  status: string;
  recording_url: string | null;
  course?: { title: string };
  batch?: { name: string };
}

interface LiveClassFormData {
  course_id: string;
  batch_id: string;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  platform: 'google_meet' | 'zoom';
  meeting_url: string;
  meeting_id: string;
  status: string;
  recording_url: string;
}

const LiveClassManagement: React.FC = () => {
  const { user, role } = useAuth();
  const isAdminOrSuperAdmin = role === 'admin' || role === 'superadmin';
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isWeeklyScheduleOpen, setIsWeeklyScheduleOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);
  const [formData, setFormData] = useState<LiveClassFormData>({
    course_id: '',
    batch_id: '',
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    platform: 'google_meet',
    meeting_url: '',
    meeting_id: '',
    status: 'scheduled',
    recording_url: '',
  });

  // Fetch courses (RLS handles visibility per role)
  const { data: courses } = useQuery({
    queryKey: ['courses-for-live-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  // Fetch batches based on selected course
  const { data: batches } = useQuery({
    queryKey: ['batches-for-live-classes', formData.course_id],
    queryFn: async () => {
      if (!formData.course_id) return [];
      const { data, error } = await supabase
        .from('batches')
        .select('id, name')
        .eq('course_id', formData.course_id)
        .in('status', ['upcoming', 'active'])
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!formData.course_id,
  });

  // Fetch live classes
  const { data: liveClasses, isLoading } = useQuery({
    queryKey: ['live-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_classes')
        .select(`
          *,
          course:courses(title),
          batch:batches(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LiveClass[];
    },
  });

  // Helper: treat datetime-local value as IST and return UTC ISO string
  const convertISTInputToUTC = (datetimeLocal: string): string => {
    // Append IST offset so JS/Supabase interprets correctly
    return new Date(datetimeLocal + ':00+05:30').toISOString();
  };

  // Helper: convert UTC ISO string to IST datetime-local value for form
  const convertUTCToISTInput = (utcIso: string): string => {
    const d = new Date(utcIso);
    // Add IST offset (5h 30m)
    const istMs = d.getTime() + (5 * 60 + 30) * 60 * 1000;
    const ist = new Date(istMs);
    const yyyy = ist.getUTCFullYear();
    const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(ist.getUTCDate()).padStart(2, '0');
    const hh = String(ist.getUTCHours()).padStart(2, '0');
    const min = String(ist.getUTCMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  // Create live class mutation
  const createMutation = useMutation({
    mutationFn: async (data: LiveClassFormData) => {
      const scheduledAtUTC = convertISTInputToUTC(data.scheduled_at);
      const insertData: any = {
        course_id: data.course_id,
        title: data.title,
        description: data.description || null,
        scheduled_at: scheduledAtUTC,
        duration_minutes: data.duration_minutes,
        platform: data.platform,
        host_id: user?.id,
        batch_id: data.batch_id || null,
        meeting_url: data.meeting_url || null,
        meeting_id: data.meeting_id || null,
        status: data.status || 'scheduled',
      };

      const { error } = await supabase.from('live_classes').insert(insertData);
      if (error) throw error;

      // Create calendar event
      try {
        await supabase.from('calendar_events').insert({
          title: data.title,
          description: data.description || null,
          event_type: 'live_class',
          course_id: data.course_id,
          batch_id: data.batch_id || null,
          start_time: scheduledAtUTC,
          end_time: new Date(new Date(scheduledAtUTC).getTime() + data.duration_minutes * 60000).toISOString(),
          color: data.platform === 'google_meet' ? '#4285F4' : '#2D8CFF',
          created_by: user?.id!,
        });
      } catch (calError) {
        console.warn('Calendar event creation failed:', calError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-classes'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Live class scheduled successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update live class mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LiveClassFormData> }) => {
      const updatePayload: any = {
        ...data,
        batch_id: data.batch_id || null,
        meeting_url: data.meeting_url || null,
        meeting_id: data.meeting_id || null,
        recording_url: data.recording_url || null,
      };
      if (data.scheduled_at) {
        updatePayload.scheduled_at = convertISTInputToUTC(data.scheduled_at);
      }
      const { error } = await supabase
        .from('live_classes')
        .update(updatePayload)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-classes'] });
      toast.success('Live class updated successfully');
      setEditingClass(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete live class mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('live_classes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-classes'] });
      toast.success('Live class deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      course_id: '',
      batch_id: '',
      title: '',
      description: '',
      scheduled_at: '',
      duration_minutes: 60,
      platform: 'google_meet',
      meeting_url: '',
      meeting_id: '',
      status: 'scheduled',
      recording_url: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClass) {
      updateMutation.mutate({ id: editingClass.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (liveClass: LiveClass) => {
    setEditingClass(liveClass);
    setFormData({
      course_id: liveClass.course_id,
      batch_id: liveClass.batch_id || '',
      title: liveClass.title,
      description: liveClass.description || '',
      scheduled_at: convertUTCToISTInput(liveClass.scheduled_at),
      duration_minutes: liveClass.duration_minutes,
      platform: liveClass.platform,
      meeting_url: liveClass.meeting_url || '',
      meeting_id: liveClass.meeting_id || '',
      status: liveClass.status,
      recording_url: liveClass.recording_url || '',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scheduled: 'secondary',
      live: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    };
    const colors: Record<string, string> = {
      scheduled: '',
      live: 'bg-green-500 hover:bg-green-500/80',
      completed: '',
      cancelled: '',
    };
    return <Badge variant={variants[status]} className={colors[status]}>{status}</Badge>;
  };

  const getPlatformBadge = (platform: string) => {
    const colors = {
      google_meet: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      zoom: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    };
    return (
      <Badge variant="outline" className={colors[platform as keyof typeof colors]}>
        {platform === 'google_meet' ? 'Google Meet' : 'Zoom'}
      </Badge>
    );
  };

  const liveClassFormJSX = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="course">Course *</Label>
        <Select value={formData.course_id} onValueChange={(value) => setFormData({ ...formData, course_id: value, batch_id: '' })}>
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

      {formData.course_id && batches && batches.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="batch">Batch (Optional)</Label>
          <Select value={formData.batch_id || 'all'} onValueChange={(value) => setFormData({ ...formData, batch_id: value === 'all' ? '' : value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select a batch (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All enrolled students</SelectItem>
              {batches?.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>
                  {batch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Class Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Introduction to React Hooks"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What will be covered in this class..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scheduled_at">Scheduled Date & Time (IST) *</Label>
          <Input
            id="scheduled_at"
            type="datetime-local"
            value={formData.scheduled_at}
            onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
            required
          />
          <p className="text-xs text-muted-foreground">Time is in Indian Standard Time (IST)</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min={15}
            max={480}
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="platform">Platform *</Label>
        <Select value={formData.platform} onValueChange={(value: 'google_meet' | 'zoom') => setFormData({ ...formData, platform: value, meeting_url: '', meeting_id: '' })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google_meet">Google Meet</SelectItem>
            <SelectItem value="zoom">Zoom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.platform === 'google_meet' && (
        <div className="space-y-2">
          <Label>Meeting URL</Label>
          <div className="flex gap-2">
            <Input
              type="url"
              value={formData.meeting_url}
              onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
              placeholder="Auto-generated or paste URL"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!formData.title || !formData.scheduled_at) {
                  toast.error('Please enter title and schedule time first');
                  return;
                }
                setIsGeneratingMeet(true);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const response = await supabase.functions.invoke('create-google-meet', {
                    body: {
                      title: formData.title,
                      description: formData.description,
                      scheduledAt: convertISTInputToUTC(formData.scheduled_at),
                      durationMinutes: formData.duration_minutes,
                    },
                  });
                  if (response.error) throw new Error(response.error.message);
                  if (response.data?.meetingUrl) {
                    setFormData({
                      ...formData,
                      meeting_url: response.data.meetingUrl,
                      meeting_id: response.data.meetingId || '',
                    });
                    toast.success('Google Meet link generated!');
                  }
                } catch (error: any) {
                  console.error('Error generating Meet:', error);
                  toast.error(error.message || 'Failed to generate Google Meet link');
                } finally {
                  setIsGeneratingMeet(false);
                }
              }}
              disabled={isGeneratingMeet || !formData.title || !formData.scheduled_at}
            >
              {isGeneratingMeet ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Click the magic wand to auto-generate a Google Meet link
          </p>
        </div>
      )}

      {formData.platform === 'zoom' && (
        <div className="space-y-2">
          <Label htmlFor="meeting_url">Zoom Meeting URL</Label>
          <Input
            id="meeting_url"
            type="url"
            value={formData.meeting_url}
            onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
            placeholder="https://zoom.us/j/xxxxxxxxxx"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="meeting_id">Meeting ID (Optional)</Label>
        <Input
          id="meeting_id"
          value={formData.meeting_id}
          onChange={(e) => setFormData({ ...formData, meeting_id: e.target.value })}
          placeholder="For reference purposes"
        />
      </div>

      {editingClass && (
        <>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recording_url">Recording URL</Label>
            <Input
              id="recording_url"
              type="url"
              value={formData.recording_url}
              onChange={(e) => setFormData({ ...formData, recording_url: e.target.value })}
              placeholder="Paste recording link after class ends"
            />
            <p className="text-xs text-muted-foreground">
              Add recording URL so students can watch later
            </p>
          </div>
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => {
          setIsCreateDialogOpen(false);
          setEditingClass(null);
          resetForm();
        }}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {(createMutation.isPending || updateMutation.isPending) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {editingClass ? 'Update Class' : 'Schedule Class'}
        </Button>
      </DialogFooter>
    </form>
  );

  const upcomingClasses = liveClasses?.filter(c => c.status === 'scheduled' && new Date(c.scheduled_at) > new Date()) || [];
  const liveNow = liveClasses?.filter(c => c.status === 'live') || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Live Class Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Schedule and manage live classes with Google Meet or Zoom
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsWeeklyScheduleOpen(true)} className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Weekly Schedule
            </Button>
            <Dialog open={isCreateDialogOpen || !!editingClass} onOpenChange={(open) => {
              if (!open) {
                setIsCreateDialogOpen(false);
                setEditingClass(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Schedule Live Class
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingClass ? 'Edit Live Class' : 'Schedule New Live Class'}</DialogTitle>
                  <DialogDescription>
                    {editingClass ? 'Update the live class details.' : 'Set up a new live class session for your students.'}
                  </DialogDescription>
                </DialogHeader>
                {liveClassFormJSX}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Weekly Schedule Dialog */}
        <WeeklyScheduleDialog open={isWeeklyScheduleOpen} onOpenChange={setIsWeeklyScheduleOpen} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Live Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-2xl font-bold">{liveNow.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{upcomingClasses.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">
                  {liveClasses?.filter(c => c.status === 'completed').length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold">{liveClasses?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Classes and Schedules */}
        <Tabs defaultValue="classes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="classes">Live Classes</TabsTrigger>
            <TabsTrigger value="schedules">Weekly Schedules</TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle>All Live Classes</CardTitle>
                <CardDescription>Manage your scheduled and past live sessions</CardDescription>
              </CardHeader>
              <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : liveClasses && liveClasses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveClasses.map((liveClass) => (
                    <TableRow key={liveClass.id}>
                      <TableCell className="font-medium">{liveClass.title}</TableCell>
                      <TableCell>{liveClass.course?.title || 'Unknown'}</TableCell>
                      <TableCell>{liveClass.batch?.name || 'All Students'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{format(new Date(liveClass.scheduled_at), 'MMM dd, yyyy')}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(liveClass.scheduled_at), 'hh:mm a')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {liveClass.duration_minutes} min
                        </div>
                      </TableCell>
                      <TableCell>{getPlatformBadge(liveClass.platform)}</TableCell>
                      <TableCell>{getStatusBadge(liveClass.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {liveClass.meeting_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={liveClass.meeting_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(liveClass)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdminOrSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this live class?')) {
                                  deleteMutation.mutate(liveClass.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No live classes scheduled</h3>
                <p className="text-muted-foreground mb-4">
                  Schedule your first live class to engage with your students in real-time.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Schedule Your First Class
                </Button>
              </div>
            )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules">
            <ScheduleList />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LiveClassManagement;
