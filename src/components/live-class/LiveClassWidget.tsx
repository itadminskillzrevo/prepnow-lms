import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay, parseISO, addDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { Video, ExternalLink, Clock, Calendar as CalendarIcon, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LiveClassWidget: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());

  // Fetch upcoming live classes for the student
  const { data: liveClasses, isLoading } = useQuery({
    queryKey: ['student-live-classes', user?.id],
    queryFn: async () => {
      const now = new Date();
      const twoWeeksFromNow = addDays(now, 14);
      
      const { data, error } = await supabase
        .from('live_classes')
        .select(`
          *,
          course:courses(title),
          batch:batches(name)
        `)
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', twoWeeksFromNow.toISOString())
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get next upcoming class
  const nextClass = liveClasses?.[0];
  
  // Get classes for selected date
  const classesOnSelectedDate = React.useMemo(() => {
    if (!selectedDate || !liveClasses) return [];
    return liveClasses.filter((lc) => 
      isSameDay(parseISO(lc.scheduled_at), selectedDate)
    );
  }, [liveClasses, selectedDate]);

  // Get dates that have classes
  const classDates = React.useMemo(() => {
    if (!liveClasses) return [];
    return liveClasses.map((lc) => parseISO(lc.scheduled_at));
  }, [liveClasses]);

  const getTimeUntilClass = (scheduledAt: string) => {
    const now = new Date();
    const classTime = new Date(scheduledAt);
    const diffMs = classTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 0) return 'Started';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
    return `${diffDays}d ${diffHours % 24}h`;
  };

  const isClassLive = (lc: any) => {
    if (lc.status === 'live') return true;
    const now = new Date();
    const classTime = new Date(lc.scheduled_at);
    const endTime = new Date(classTime.getTime() + lc.duration_minutes * 60000);
    return now >= classTime && now <= endTime;
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-border overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Live Classes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Next Class Banner */}
        {nextClass && (
          <div className={cn(
            "p-4 border-b",
            isClassLive(nextClass) 
              ? "bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/20" 
              : "bg-gradient-to-r from-blue-500/10 to-blue-500/5"
          )}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isClassLive(nextClass) && (
                    <Badge variant="destructive" className="animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white mr-1.5" />
                      LIVE NOW
                    </Badge>
                  )}
                  {!isClassLive(nextClass) && (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {getTimeUntilClass(nextClass.scheduled_at)}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-foreground truncate">{nextClass.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(nextClass.scheduled_at), 'EEE, MMM d • h:mm a')}
                </p>
                {nextClass.course && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {nextClass.course.title}
                    {nextClass.batch && ` • ${nextClass.batch.name}`}
                  </p>
                )}
              </div>
              {nextClass.meeting_url && (
                <Button 
                  size="sm" 
                  className={cn(
                    "shrink-0 gap-2",
                    isClassLive(nextClass) && "bg-red-500 hover:bg-red-600"
                  )}
                  asChild
                >
                  <a href={nextClass.meeting_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {isClassLive(nextClass) ? 'Join Now' : 'Join'}
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Calendar and Schedule View */}
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
          {/* Mini Calendar */}
          <div className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md w-full"
              modifiers={{
                hasClass: (date) => classDates.some((d) => isSameDay(d, date)),
              }}
              modifiersStyles={{
                hasClass: {
                  fontWeight: 'bold',
                  color: 'hsl(var(--primary))',
                },
              }}
              components={{
                DayContent: ({ date }) => {
                  const hasClass = classDates.some((d) => isSameDay(d, date));
                  return (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <span>{date.getDate()}</span>
                      {hasClass && (
                        <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>

          {/* Classes for Selected Date */}
          <div className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
            </h4>
            
            {classesOnSelectedDate.length > 0 ? (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {classesOnSelectedDate.map((lc) => (
                  <div
                    key={lc.id}
                    className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{lc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(lc.scheduled_at), 'h:mm a')} • {lc.duration_minutes} min
                        </p>
                      </div>
                      {lc.meeting_url && (
                        <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                          <a href={lc.meeting_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No classes scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* All Upcoming Classes */}
        {liveClasses && liveClasses.length > 1 && (
          <div className="p-4 border-t bg-secondary/20">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Upcoming Classes ({liveClasses.length})
            </h4>
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {liveClasses.slice(0, 5).map((lc) => (
                <div
                  key={lc.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                    selectedDate && isSameDay(parseISO(lc.scheduled_at), selectedDate)
                      ? "bg-primary/10"
                      : "hover:bg-secondary"
                  )}
                  onClick={() => setSelectedDate(parseISO(lc.scheduled_at))}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-center shrink-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        {format(parseISO(lc.scheduled_at), 'MMM')}
                      </p>
                      <p className="text-lg font-bold">
                        {format(parseISO(lc.scheduled_at), 'd')}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{lc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(lc.scheduled_at), 'EEE, h:mm a')}
                      </p>
                    </div>
                  </div>
                  {isClassLive(lc) && (
                    <Badge variant="destructive" className="shrink-0">Live</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!liveClasses || liveClasses.length === 0) && (
          <div className="text-center py-12 px-4">
            <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-1">No Upcoming Classes</h3>
            <p className="text-sm text-muted-foreground">
              Your scheduled live classes will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
