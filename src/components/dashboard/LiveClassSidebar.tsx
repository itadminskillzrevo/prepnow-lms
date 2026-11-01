import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, addMinutes, isAfter, isBefore, addDays } from 'date-fns';
import { formatIST } from '@/lib/dateUtils';
import { 
  Video, 
  ExternalLink, 
  Clock, 
  Calendar, 
  PlayCircle,
  History,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  created_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  recording_url: string | null;
  status: string;
  course: { title: string } | null;
  batch: { name: string } | null;
}

export const LiveClassSidebar: React.FC = () => {
  const { user, role } = useAuth();
  const isInstructor = role === 'instructor';

  // Fetch live classes based on course enrollments (simple link-based, no batch dependency)
  const { data: liveClasses, isLoading } = useQuery({
    queryKey: ['sidebar-live-classes', user?.id, role],
    queryFn: async () => {
      if (!user?.id) return { upcoming: [], ongoing: [], past: [] };

      const now = new Date();
      const twoWeeksAgo = addDays(now, -14);
      const twoWeeksFromNow = addDays(now, 14);

      if (isInstructor) {
        // For instructors: show classes they host or for courses they own
        const { data, error } = await supabase
          .from('live_classes')
          .select(`
            id, title, description, scheduled_at, created_at, duration_minutes,
            meeting_url, recording_url, status,
            course:courses(title),
            batch:batches(name)
          `)
          .eq('host_id', user.id)
          .gte('scheduled_at', twoWeeksAgo.toISOString())
          .lte('scheduled_at', twoWeeksFromNow.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;
        return categorizeClasses((data as LiveClass[]) || [], now);
      } else {
        // For students: get enrolled course ids, then show all live classes for those courses
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('user_id', user.id)
          .in('status', ['active', 'completed']);

        const courseIds = enrollments?.map(e => e.course_id) || [];

        if (courseIds.length === 0) {
          return { upcoming: [], ongoing: [], past: [] };
        }

        const { data, error } = await supabase
          .from('live_classes')
          .select(`
            id, title, description, scheduled_at, created_at, duration_minutes,
            meeting_url, recording_url, status,
            course:courses(title),
            batch:batches(name)
          `)
          .in('course_id', courseIds)
          .gte('scheduled_at', twoWeeksAgo.toISOString())
          .lte('scheduled_at', twoWeeksFromNow.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;
        return categorizeClasses((data as LiveClass[]) || [], now);
      }
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const categorizeClasses = (classes: LiveClass[], now: Date) => {
    const upcoming: LiveClass[] = [];
    const ongoing: LiveClass[] = [];
    const past: LiveClass[] = [];

    classes.forEach((lc) => {
      const startTime = parseISO(lc.scheduled_at);
      const endTime = addMinutes(startTime, lc.duration_minutes);

      if (lc.status === 'cancelled') return;

      if (isBefore(now, startTime)) {
        upcoming.push(lc);
      } else if (isAfter(now, endTime)) {
        past.push(lc);
      } else {
        ongoing.push(lc);
      }
    });

    return {
      upcoming: upcoming.slice(0, 5),
      ongoing,
      past: past.slice(0, 3),
    };
  };

  const getTimeUntil = (scheduledAt: string) => {
    const now = new Date();
    const classTime = parseISO(scheduledAt);
    const diffMs = classTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 0) return 'Starting';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
    return `${diffDays}d`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasOngoing = liveClasses?.ongoing && liveClasses.ongoing.length > 0;
  const hasUpcoming = liveClasses?.upcoming && liveClasses.upcoming.length > 0;
  const hasPast = liveClasses?.past && liveClasses.past.length > 0;
  const isEmpty = !hasOngoing && !hasUpcoming && !hasPast;

  return (
    <div className="space-y-4 min-w-0 w-full max-w-full overflow-hidden">
      {/* Live Now Section */}
      {hasOngoing && (
        <Card className="border-destructive/50 bg-gradient-to-br from-destructive/10 to-destructive/5 shadow-lg shadow-destructive/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive/70 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
              </span>
              Live Now
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {liveClasses?.ongoing.map((lc) => {
              const joinUrl = lc.meeting_url?.trim() || null;

              return (
                <div
                  key={lc.id}
                  className="p-3 rounded-lg bg-background/80 border border-destructive/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{lc.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lc.course?.title}
                      </p>
                    </div>
                  </div>
                  {joinUrl ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full mt-2 gap-2"
                      asChild
                    >
                      <a href={joinUrl} target="_blank" rel="noopener noreferrer">
                        <PlayCircle className="h-4 w-4" />
                        Join Now
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 gap-2"
                      disabled
                    >
                      <PlayCircle className="h-4 w-4" />
                      Join Now
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Classes */}
      <Card className="border-border shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Upcoming Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasUpcoming ? (
            <ScrollArea className="h-[420px] w-full overflow-x-hidden">
              <div className="space-y-2 pr-2">
                {liveClasses?.upcoming.map((lc, index) => {
                  const joinUrl = lc.meeting_url?.trim() || null;

                  return (
                    <div
                      key={lc.id}
                      className={cn(
                        "w-full max-w-full min-w-0 p-3 rounded-lg transition-colors border overflow-hidden",
                        index === 0
                          ? "bg-primary/5 border-primary/20"
                          : "bg-secondary/30 border-border hover:bg-secondary/60"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="secondary" className="text-xs shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          {getTimeUntil(lc.scheduled_at)}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm leading-snug break-words whitespace-normal">{lc.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground min-w-0">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {formatIST(lc.scheduled_at, 'EEE, MMM d • h:mm a')}
                        </span>
                      </div>
                      {lc.course && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug break-words whitespace-normal">
                          {lc.course.title}
                          {lc.batch ? ` - ${lc.batch.name}` : ''}
                        </p>
                      )}

                      {joinUrl ? (
                        <Button
                          size="sm"
                          variant={index === 0 ? "default" : "outline"}
                          className="w-full max-w-full mt-2.5 gap-2 overflow-hidden"
                          asChild
                        >
                          <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="flex w-full max-w-full items-center justify-center gap-2 min-w-0 overflow-hidden">
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Join Class</span>
                          </a>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full max-w-full mt-2.5 gap-2 overflow-hidden"
                          disabled
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Join Class</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming classes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Classes with Recordings */}
      {hasPast && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <History className="h-4 w-4" />
              Recent Recordings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {liveClasses?.past.map((lc) => (
                <div
                  key={lc.id}
                  className="p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{lc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatIST(lc.scheduled_at, 'MMM d')}
                      </p>
                    </div>
                    {lc.recording_url ? (
                      <Button size="sm" variant="ghost" className="h-7 gap-1" asChild>
                        <a href={lc.recording_url} target="_blank" rel="noopener noreferrer">
                          <PlayCircle className="h-3 w-3" />
                          Watch
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        No recording
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {isEmpty && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold mb-1">No Live Classes</h3>
            <p className="text-sm text-muted-foreground">
              Live classes from your batches will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
