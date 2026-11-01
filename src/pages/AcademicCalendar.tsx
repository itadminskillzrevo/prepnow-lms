import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Video, FileText, ClipboardList, Calendar as CalendarIcon, BookOpen, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: 'live_class' | 'assignment' | 'quiz' | 'batch_start' | 'batch_end' | 'custom';
  reference_id: string | null;
  course_id: string | null;
  batch_id: string | null;
  start_time: string;
  end_time: string | null;
  is_all_day: boolean;
  color: string | null;
  course?: { title: string };
  batch?: { name: string };
}

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  platform: string;
  meeting_url: string | null;
  status: string;
  course?: { title: string };
  batch?: { name: string };
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  lesson?: {
    title: string;
    module?: {
      course?: { title: string };
    };
  };
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  lesson?: {
    title: string;
    module?: {
      course?: { title: string };
    };
  };
}

const AcademicCalendar: React.FC = () => {
  const { role } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterType, setFilterType] = useState<string>('all');

  const isAdmin = role === 'admin' || role === 'superadmin' || role === 'instructor';

  // Fetch calendar events
  const { data: calendarEvents } = useQuery({
    queryKey: ['calendar-events', currentMonth],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          course:courses(title),
          batch:batches(name)
        `)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time');
      
      if (error) throw error;
      return data as CalendarEvent[];
    },
  });

  // Fetch live classes
  const { data: liveClasses } = useQuery({
    queryKey: ['live-classes-calendar', currentMonth],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('live_classes')
        .select(`
          *,
          course:courses(title),
          batch:batches(name)
        `)
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
        .neq('status', 'cancelled')
        .order('scheduled_at');
      
      if (error) throw error;
      return data as LiveClass[];
    },
  });

  // Fetch assignments with due dates
  const { data: assignments } = useQuery({
    queryKey: ['assignments-calendar', currentMonth],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          lesson:lessons(
            title,
            module:modules(
              course:courses(title)
            )
          )
        `)
        .not('due_date', 'is', null)
        .gte('due_date', start.toISOString())
        .lte('due_date', end.toISOString())
        .order('due_date');
      
      if (error) throw error;
      return data as Assignment[];
    },
  });

  // Fetch quizzes (we'll show them but they don't have due dates typically)
  const { data: quizzes } = useQuery({
    queryKey: ['quizzes-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          lesson:lessons(
            title,
            module:modules(
              course:courses(title)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Quiz[];
    },
  });

  // Combine all events
  const allEvents = useMemo(() => {
    const events: Array<{
      id: string;
      type: 'live_class' | 'assignment' | 'quiz' | 'event';
      title: string;
      description: string | null;
      date: Date;
      endDate?: Date;
      course: string | null;
      batch?: string | null;
      meetingUrl?: string | null;
      platform?: string;
      status?: string;
      color: string;
    }> = [];

    // Add live classes
    liveClasses?.forEach((lc) => {
      events.push({
        id: lc.id,
        type: 'live_class',
        title: lc.title,
        description: lc.description,
        date: parseISO(lc.scheduled_at),
        endDate: new Date(new Date(lc.scheduled_at).getTime() + lc.duration_minutes * 60000),
        course: lc.course?.title || null,
        batch: lc.batch?.name,
        meetingUrl: lc.meeting_url,
        platform: lc.platform,
        status: lc.status,
        color: lc.platform === 'google_meet' ? '#4285F4' : '#2D8CFF',
      });
    });

    // Add assignments
    assignments?.forEach((a) => {
      if (a.due_date) {
        events.push({
          id: a.id,
          type: 'assignment',
          title: a.title,
          description: a.description,
          date: parseISO(a.due_date),
          course: a.lesson?.module?.course?.title || null,
          color: '#F59E0B',
        });
      }
    });

    // Add custom calendar events
    calendarEvents?.forEach((ce) => {
      events.push({
        id: ce.id,
        type: 'event',
        title: ce.title,
        description: ce.description,
        date: parseISO(ce.start_time),
        endDate: ce.end_time ? parseISO(ce.end_time) : undefined,
        course: ce.course?.title || null,
        batch: ce.batch?.name,
        color: ce.color || '#6366F1',
      });
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [liveClasses, assignments, calendarEvents]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return allEvents;
    return allEvents.filter((e) => e.type === filterType);
  }, [allEvents, filterType]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents.filter((e) => isSameDay(e.date, selectedDate));
  }, [filteredEvents, selectedDate]);

  // Get dates that have events
  const eventDates = useMemo(() => {
    return filteredEvents.map((e) => e.date);
  }, [filteredEvents]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'live_class':
        return <Video className="h-4 w-4" />;
      case 'assignment':
        return <FileText className="h-4 w-4" />;
      case 'quiz':
        return <ClipboardList className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const getEventTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      live_class: { label: 'Live Class', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      assignment: { label: 'Assignment', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
      quiz: { label: 'Quiz', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      event: { label: 'Event', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    };
    const config = variants[type] || variants.event;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const modifiers = {
    hasEvent: (date: Date) => eventDates.some((d) => isSameDay(d, date)),
  };

  const modifiersStyles = {
    hasEvent: {
      position: 'relative' as const,
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Academic Calendar
            </h1>
            <p className="text-muted-foreground mt-1">
              View all your scheduled classes, assignments, and academic events
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="live_class">Live Classes</SelectItem>
                <SelectItem value="assignment">Assignments</SelectItem>
                <SelectItem value="event">Custom Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Live Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{liveClasses?.length || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">this month</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Assignments Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">{assignments?.length || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">this month</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Quizzes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold">{quizzes?.length || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">available</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{calendarEvents?.length || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">this month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setCurrentMonth(new Date());
                    setSelectedDate(new Date());
                  }}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-md w-full"
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                components={{
                  DayContent: ({ date }) => {
                    const hasEvents = eventDates.some((d) => isSameDay(d, date));
                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <span>{date.getDate()}</span>
                        {hasEvents && (
                          <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                        )}
                      </div>
                    );
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Events for Selected Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
              </CardTitle>
              <CardDescription>
                {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                      style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getEventIcon(event.type)}
                          <h4 className="font-medium">{event.title}</h4>
                        </div>
                        {getEventTypeBadge(event.type)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {format(event.date, 'hh:mm a')}
                        {event.endDate && ` - ${format(event.endDate, 'hh:mm a')}`}
                      </p>
                      {event.course && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          {event.course}
                        </div>
                      )}
                      {event.batch && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {event.batch}
                        </Badge>
                      )}
                      {event.meetingUrl && (
                        <Button variant="outline" size="sm" className="mt-3 w-full gap-2" asChild>
                          <a href={event.meetingUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            Join {event.platform === 'google_meet' ? 'Google Meet' : 'Zoom'}
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No events scheduled for this date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events List */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>All scheduled events for this month</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEvents.length > 0 ? (
              <div className="space-y-3">
                {filteredEvents.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer",
                      selectedDate && isSameDay(event.date, selectedDate) && "bg-accent"
                    )}
                    onClick={() => setSelectedDate(event.date)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${event.color}20` }}
                      >
                        {getEventIcon(event.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(event.date, 'MMM dd, yyyy')} at {format(event.date, 'hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.course && (
                        <Badge variant="outline" className="text-xs">
                          {event.course}
                        </Badge>
                      )}
                      {getEventTypeBadge(event.type)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No events this month</h3>
                <p className="text-muted-foreground">
                  {isAdmin ? 'Schedule live classes or create events to see them here.' : 'Check back later for upcoming events.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AcademicCalendar;
