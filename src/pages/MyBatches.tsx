import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isAfter, isBefore, addMinutes } from 'date-fns';
import { 
  Layers, 
  Calendar, 
  Video, 
  Clock, 
  Users, 
  ExternalLink, 
  BookOpen,
  Loader2,
  CalendarDays
} from 'lucide-react';

interface BatchWithCourse {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  max_students: number;
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  };
}

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  platform: string;
  status: string;
  course: {
    title: string;
  };
  batch: {
    name: string;
  } | null;
}

const MyBatches: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch batches the student is enrolled in
  const { data: batches, isLoading: loadingBatches } = useQuery({
    queryKey: ['student-batches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: enrollments, error } = await supabase
        .from('batch_enrollments')
        .select('batch_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      if (!enrollments || enrollments.length === 0) return [];

      const batchIds = enrollments.map(e => e.batch_id);

      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select(`
          *,
          course:courses(id, title, thumbnail_url)
        `)
        .in('id', batchIds)
        .order('start_date', { ascending: false });

      if (batchError) throw batchError;

      return batchData as BatchWithCourse[];
    },
    enabled: !!user?.id,
  });

  // Fetch live classes for the student's batches
  const { data: liveClasses, isLoading: loadingClasses } = useQuery({
    queryKey: ['student-live-classes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get the batches the student is enrolled in
      const { data: enrollments } = await supabase
        .from('batch_enrollments')
        .select('batch_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!enrollments || enrollments.length === 0) return [];

      const batchIds = enrollments.map(e => e.batch_id);

      // Get live classes for those batches
      const { data: classes, error } = await supabase
        .from('live_classes')
        .select(`
          *,
          course:courses(title),
          batch:batches(name)
        `)
        .in('batch_id', batchIds)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      return classes as LiveClass[];
    },
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      upcoming: 'secondary',
      active: 'default',
      completed: 'outline',
      cancelled: 'destructive',
      scheduled: 'secondary',
      live: 'default',
      ended: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getClassStatus = (scheduledAt: string, durationMinutes: number) => {
    const now = new Date();
    const startTime = new Date(scheduledAt);
    const endTime = addMinutes(startTime, durationMinutes);

    if (isBefore(now, startTime)) return 'upcoming';
    if (isAfter(now, endTime)) return 'ended';
    return 'live';
  };

  const upcomingClasses = liveClasses?.filter(c => {
    const status = getClassStatus(c.scheduled_at, c.duration_minutes);
    return status === 'upcoming' || status === 'live';
  }) || [];

  const pastClasses = liveClasses?.filter(c => {
    const status = getClassStatus(c.scheduled_at, c.duration_minutes);
    return status === 'ended';
  }) || [];

  const isLoading = loadingBatches || loadingClasses;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            My Batches
          </h1>
          <p className="text-muted-foreground mt-1">
            View your enrolled batches and upcoming live classes
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="batches" className="space-y-6">
            <TabsList>
              <TabsTrigger value="batches" className="gap-2">
                <Layers className="h-4 w-4" />
                My Batches ({batches?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="live-classes" className="gap-2">
                <Video className="h-4 w-4" />
                Live Classes ({upcomingClasses.length})
              </TabsTrigger>
            </TabsList>

            {/* Batches Tab */}
            <TabsContent value="batches" className="space-y-4">
              {batches && batches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {batches.map((batch) => (
                    <Card 
                      key={batch.id} 
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/batches/${batch.id}`)}
                    >
                      <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {batch.course.thumbnail_url ? (
                          <img 
                            src={batch.course.thumbnail_url} 
                            alt={batch.course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="h-12 w-12 text-primary/40" />
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-1">{batch.name}</CardTitle>
                          {getStatusBadge(batch.status)}
                        </div>
                        <CardDescription className="line-clamp-1">
                          {batch.course.title}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(batch.start_date), 'MMM dd, yyyy')}
                              {batch.end_date && ` - ${format(new Date(batch.end_date), 'MMM dd, yyyy')}`}
                            </span>
                          </div>
                          {batch.description && (
                            <p className="text-xs line-clamp-2">{batch.description}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Batches Yet</h3>
                    <p className="text-muted-foreground">
                      You haven't been enrolled in any batches yet. Check back later or contact your administrator.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Live Classes Tab */}
            <TabsContent value="live-classes" className="space-y-6">
              {/* Upcoming Classes */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Upcoming & Live Classes
                </h2>
                {upcomingClasses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingClasses.map((liveClass) => {
                      const status = getClassStatus(liveClass.scheduled_at, liveClass.duration_minutes);
                      const isLive = status === 'live';

                      return (
                        <Card key={liveClass.id} className={isLive ? 'border-green-500 shadow-green-500/20 shadow-lg' : ''}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {isLive && (
                                    <span className="flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                  )}
                                  {liveClass.title}
                                </CardTitle>
                                <CardDescription>{liveClass.course.title}</CardDescription>
                              </div>
                              {isLive ? (
                                <Badge variant="default" className="bg-green-500">LIVE</Badge>
                              ) : (
                                <Badge variant="secondary">Scheduled</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(liveClass.scheduled_at), 'MMM dd, yyyy')}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {format(new Date(liveClass.scheduled_at), 'hh:mm a')}
                              </div>
                              <div className="flex items-center gap-1">
                                <Video className="h-4 w-4" />
                                {liveClass.duration_minutes} min
                              </div>
                            </div>
                            {liveClass.batch && (
                              <div className="flex items-center gap-1 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Batch:</span>
                                <span className="font-medium">{liveClass.batch.name}</span>
                              </div>
                            )}
                            {liveClass.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {liveClass.description}
                              </p>
                            )}
                            {liveClass.meeting_url && (
                              <Button 
                                className="w-full gap-2" 
                                variant={isLive ? 'default' : 'outline'}
                                onClick={() => window.open(liveClass.meeting_url!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                                {isLive ? 'Join Now' : 'Join Class'}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Video className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-muted-foreground">No upcoming live classes scheduled</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Past Classes */}
              {pastClasses.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Past Classes
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pastClasses.slice(0, 6).map((liveClass) => (
                      <Card key={liveClass.id} className="opacity-75">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{liveClass.title}</CardTitle>
                          <CardDescription className="text-xs">
                            {liveClass.course.title}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(liveClass.scheduled_at), 'MMM dd, yyyy')}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyBatches;
