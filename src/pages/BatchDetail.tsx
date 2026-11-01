import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DriveAttachmentList } from '@/components/google-drive';
import { format } from 'date-fns';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Users,
  Video,
  FileText,
  FolderOpen,
  PlayCircle,
  Clock,
  Layers,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
  sub_modules: SubModule[];
}

interface SubModule {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  recorded_video_url: string | null;
  duration_minutes: number;
  order_index: number;
  content: string | null;
}

interface LiveClass {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  recording_url: string | null;
  status: string;
}

const BatchDetail: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canEdit = ['superadmin', 'admin', 'instructor'].includes(role || '');

  // Fetch batch details with curriculum
  const { data: batch, isLoading: loadingBatch } = useQuery({
    queryKey: ['batch-detail', batchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          course:courses(id, title, thumbnail_url),
          curriculum:curriculums(id, name, description)
        `)
        .eq('id', batchId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!batchId,
  });

  // Fetch curriculum structure (modules → sub_modules → lessons)
  const { data: modules, isLoading: loadingModules } = useQuery({
    queryKey: ['batch-curriculum-structure', batch?.curriculum_id],
    queryFn: async () => {
      if (!batch?.curriculum_id) return [];

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('id, title, description, order_index')
        .eq('curriculum_id', batch.curriculum_id)
        .order('order_index');

      if (modulesError) throw modulesError;

      // For each module, fetch sub_modules and lessons
      const modulesWithContent = await Promise.all(
        (modulesData || []).map(async (module) => {
          // Fetch sub-modules
          const { data: subModulesData } = await supabase
            .from('sub_modules')
            .select('id, title, description, order_index')
            .eq('module_id', module.id)
            .order('order_index');

          // Fetch lessons for module
          const { data: moduleLessons } = await supabase
            .from('lessons')
            .select('id, title, video_url, recorded_video_url, duration_minutes, order_index, content')
            .eq('module_id', module.id)
            .is('sub_module_id', null)
            .order('order_index');

          // Fetch lessons for each sub-module
          const subModulesWithLessons = await Promise.all(
            (subModulesData || []).map(async (subModule) => {
              const { data: subLessons } = await supabase
                .from('lessons')
                .select('id, title, video_url, recorded_video_url, duration_minutes, order_index, content')
                .eq('sub_module_id', subModule.id)
                .order('order_index');

              return {
                ...subModule,
                lessons: subLessons || [],
              } as SubModule;
            })
          );

          return {
            ...module,
            lessons: moduleLessons || [],
            sub_modules: subModulesWithLessons,
          } as Module;
        })
      );

      return modulesWithContent;
    },
    enabled: !!batch?.curriculum_id,
  });

  // Fetch live classes for the batch
  const { data: liveClasses, isLoading: loadingClasses } = useQuery({
    queryKey: ['batch-live-classes', batchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_classes')
        .select('*')
        .eq('batch_id', batchId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      return data as LiveClass[];
    },
    enabled: !!batchId,
  });

  // Fetch enrollment count
  const { data: enrollmentCount } = useQuery({
    queryKey: ['batch-enrollment-count', batchId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('batch_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!batchId,
  });

  const isLoading = loadingBatch || loadingModules || loadingClasses;

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

  const totalLessons = modules?.reduce((acc, m) => {
    const moduleLessons = m.lessons.length;
    const subModuleLessons = m.sub_modules.reduce((sum, sm) => sum + sm.lessons.length, 0);
    return acc + moduleLessons + subModuleLessons;
  }, 0) || 0;

  const totalDuration = modules?.reduce((acc, m) => {
    const moduleDuration = m.lessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    const subModuleDuration = m.sub_modules.reduce((sum, sm) => 
      sum + sm.lessons.reduce((s, l) => s + (l.duration_minutes || 0), 0), 0);
    return acc + moduleDuration + subModuleDuration;
  }, 0) || 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!batch) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Batch not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">{batch.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              {getStatusBadge(batch.status)}
              {batch.course && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {batch.course.title}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {enrollmentCount} / {batch.max_students}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Modules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{modules?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lessons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{totalLessons}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {Math.round(totalDuration / 60)}h
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="curriculum" className="space-y-6">
          <TabsList>
            <TabsTrigger value="curriculum" className="gap-2">
              <Layers className="h-4 w-4" />
              Curriculum
            </TabsTrigger>
            <TabsTrigger value="live-classes" className="gap-2">
              <Video className="h-4 w-4" />
              Live Classes ({liveClasses?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  {batch.curriculum?.name || 'Curriculum'}
                </CardTitle>
                {batch.curriculum?.description && (
                  <CardDescription>{batch.curriculum.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {modules && modules.length > 0 ? (
                  <Accordion type="multiple" className="space-y-2">
                    {modules.map((module, moduleIndex) => (
                      <AccordionItem
                        key={module.id}
                        value={module.id}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-3 text-left">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {moduleIndex + 1}
                            </div>
                            <div>
                              <p className="font-semibold">{module.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {module.lessons.length + module.sub_modules.reduce((s, sm) => s + sm.lessons.length, 0)} lessons
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          {/* Module Description */}
                          {module.description && (
                            <p className="text-sm text-muted-foreground mb-4 pl-11">
                              {module.description}
                            </p>
                          )}

                          {/* Module Lessons */}
                          {module.lessons.length > 0 && (
                            <div className="space-y-2 pl-11 mb-4">
                              {module.lessons.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                                  onClick={() => navigate(`/courses/${batch.course?.id}/lessons/${lesson.id}`)}
                                >
                                  <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{lesson.title}</p>
                                  </div>
                                  {lesson.duration_minutes > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {lesson.duration_minutes} min
                                    </span>
                                  )}
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Sub-Modules */}
                          {module.sub_modules.map((subModule, subIndex) => (
                            <div key={subModule.id} className="pl-11 mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                                  {moduleIndex + 1}.{subIndex + 1}
                                </div>
                                <p className="font-medium text-sm">{subModule.title}</p>
                              </div>
                              <div className="space-y-2 pl-8">
                                {subModule.lessons.map((lesson) => (
                                  <div
                                    key={lesson.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/courses/${batch.course?.id}/lessons/${lesson.id}`)}
                                  >
                                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm truncate">{lesson.title}</p>
                                    </div>
                                    {lesson.duration_minutes > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        {lesson.duration_minutes} min
                                      </span>
                                    )}
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {/* Module Drive Attachments */}
                          {canEdit && (
                            <div className="pl-11 mt-4">
                              <DriveAttachmentList
                                entityType="module"
                                entityId={module.id}
                                title="Module Resources"
                                canEdit={canEdit}
                              />
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No curriculum content yet</p>
                    {canEdit && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate(`/admin/curriculum/${batch.curriculum_id}/edit`)}
                      >
                        Add Content
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Classes Tab */}
          <TabsContent value="live-classes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Live Classes</CardTitle>
                <CardDescription>
                  Scheduled and past live sessions for this batch
                </CardDescription>
              </CardHeader>
              <CardContent>
                {liveClasses && liveClasses.length > 0 ? (
                  <div className="space-y-3">
                    {liveClasses.map((lc) => (
                      <div
                        key={lc.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Video className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{lc.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(lc.scheduled_at), 'EEE, MMM d, yyyy • h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(lc.status)}
                          {lc.meeting_url && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={lc.meeting_url} target="_blank" rel="noopener noreferrer">
                                Join
                              </a>
                            </Button>
                          )}
                          {lc.recording_url && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={lc.recording_url} target="_blank" rel="noopener noreferrer">
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Watch
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No live classes scheduled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            <DriveAttachmentList
              entityType="batch"
              entityId={batchId!}
              title="Batch Resources"
              canEdit={canEdit}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default BatchDetail;
