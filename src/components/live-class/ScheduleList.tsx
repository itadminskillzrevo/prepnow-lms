import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Calendar, Clock, Trash2, Users, User, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Schedule {
  id: string;
  course_id: string;
  batch_id: string | null;
  target_student_id: string | null;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  title: string;
  description: string | null;
  platform: string;
  is_active: boolean;
  course?: { title: string };
  batch?: { name: string };
}

import { useAuth } from '@/contexts/AuthContext';

export const ScheduleList: React.FC = () => {
  const { role } = useAuth();
  const isAdminOrSuperAdmin = role === 'admin' || role === 'superadmin';
  const queryClient = useQueryClient();

  // Fetch all schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['weekly-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_class_schedules')
        .select(`
          *,
          course:courses(title),
          batch:batches(name)
        `)
        .order('day_of_week')
        .order('start_time');
      if (error) throw error;
      return data as Schedule[];
    },
  });

  // Toggle schedule active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('live_class_schedules')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-schedules'] });
      toast.success('Schedule updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete schedule
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('live_class_schedules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-schedules'] });
      toast.success('Schedule deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm} IST`;
  };

  const getTargetBadge = (schedule: Schedule) => {
    if (schedule.target_student_id) {
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <User className="h-3 w-3 mr-1" />
          Individual
        </Badge>
      );
    }
    if (schedule.batch) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Users className="h-3 w-3 mr-1" />
          {schedule.batch.name}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <Users className="h-3 w-3 mr-1" />
        All Students
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Group schedules by day
  const schedulesByDay = DAYS_OF_WEEK.map((day, index) => ({
    day,
    dayIndex: index,
    schedules: schedules?.filter((s) => s.day_of_week === index) || [],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Weekly Schedules
        </CardTitle>
        <CardDescription>
          Manage recurring weekly class schedules. Classes will be auto-generated with Google Meet links.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!schedules || schedules.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-1">No Weekly Schedules</h3>
            <p className="text-sm text-muted-foreground">
              Create a weekly schedule to auto-generate recurring live classes
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {schedulesByDay.filter((d) => d.schedules.length > 0).map((dayGroup) => (
              <div key={dayGroup.day}>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Badge variant="secondary">{dayGroup.day}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {dayGroup.schedules.length} class{dayGroup.schedules.length !== 1 ? 'es' : ''}
                  </span>
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Active</TableHead>
                        {isAdminOrSuperAdmin && <TableHead className="w-[50px]"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayGroup.schedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {formatTime(schedule.start_time)}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {schedule.duration_minutes} min
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{schedule.title}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {schedule.course?.title}
                          </TableCell>
                          <TableCell>{getTargetBadge(schedule)}</TableCell>
                          <TableCell>
                            <Switch
                              checked={schedule.is_active}
                              onCheckedChange={(checked) =>
                                toggleMutation.mutate({ id: schedule.id, isActive: checked })
                              }
                            />
                          </TableCell>
                          {isAdminOrSuperAdmin && (
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this weekly schedule? This won't affect already created classes.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(schedule.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
