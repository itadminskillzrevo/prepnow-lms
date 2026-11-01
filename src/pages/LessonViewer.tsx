import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  Download,
  Clock,
  BookOpen,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const LessonViewer: React.FC = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: lesson } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const { data } = await supabase.from('lessons').select('*').eq('id', lessonId).single();
      return data;
    },
    enabled: !!lessonId,
  });

  const { data: module } = useQuery({
    queryKey: ['lesson-module', lesson?.module_id],
    queryFn: async () => {
      const { data: moduleData } = await supabase
        .from('modules')
        .select('*, lessons:lessons(*)')
        .eq('id', lesson?.module_id)
        .single();
      if (!moduleData) return null;
      moduleData.lessons = (moduleData.lessons || []).sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
      );
      return moduleData;
    },
    enabled: !!lesson?.module_id,
  });

  const { data: allLessonProgress } = useQuery({
    queryKey: ['module-lesson-progress', module?.id, user?.id],
    queryFn: async () => {
      const lessonIds = (module?.lessons || []).map((l: any) => l.id);
      if (lessonIds.length === 0) return [];
      const { data } = await supabase
        .from('lesson_progress')
        .select('*')
        .in('lesson_id', lessonIds)
        .eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!module?.id && !!user?.id,
  });

  const { data: materials } = useQuery({
    queryKey: ['lesson-materials', lessonId],
    queryFn: async () => {
      const { data } = await supabase.from('course_materials').select('*').eq('lesson_id', lessonId);
      return data || [];
    },
    enabled: !!lessonId,
  });

  const { data: progress } = useQuery({
    queryKey: ['lesson-progress', lessonId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!lessonId && !!user?.id,
  });

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('lesson_progress').upsert({
        user_id: user?.id,
        lesson_id: lessonId,
        is_completed: true,
        progress_percent: 100,
        completed_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
      queryClient.invalidateQueries({ queryKey: ['module-lesson-progress'] });
      toast.success('Lesson marked as complete!');
    },
  });

  const lessons = module?.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || [];
  const currentIndex = lessons.findIndex((l: any) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(`/courses/${courseId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block">
              <p className="text-xs text-primary font-medium">{module?.title}</p>
              <p className="font-semibold truncate max-w-md">{lesson?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {progress?.is_completed ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-500/10 px-4 py-2 rounded-full text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                Completed
              </div>
            ) : (
              <Button onClick={() => markCompleteMutation.mutate()} className="shadow-md">
                <Check className="mr-2 h-4 w-4" />
                Mark Complete
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="overflow-hidden border-0 shadow-xl">
              <CardContent className="p-0">
                <div className="relative">
                  <VideoPlayer url={lesson?.video_url || ''} className="rounded-t-xl" />
                </div>
                <div className="p-5 sm:p-6">
                  <h1 className="text-xl sm:text-2xl font-bold mb-3">{lesson?.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
                    <span className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
                      <Clock className="h-4 w-4 text-primary" />
                      {lesson?.duration_minutes || 0} min
                    </span>
                  </div>
                  {lesson?.content && (
                    <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/30 rounded-xl p-4 sm:p-5">
                      <p className="whitespace-pre-wrap leading-relaxed">{lesson.content}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {materials && materials.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    Downloadable Materials
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {materials.map((material: any) => (
                      <div key={material.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium">{material.title}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-full" asChild>
                          <a href={material.file_url} download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between gap-4">
              <Button
                variant="outline"
                className="flex-1 h-12"
                disabled={!prevLesson}
                onClick={() => prevLesson && navigate(`/courses/${courseId}/lessons/${prevLesson.id}`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button
                className="flex-1 h-12"
                disabled={!nextLesson}
                onClick={() => nextLesson && navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="sticky top-24 border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Lessons
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[450px]">
                  <div className="p-4 space-y-2">
                    {lessons.map((l: any, index: number) => {
                      const lp = allLessonProgress?.find((p: any) => p.lesson_id === l.id);
                      const isCompleted = lp?.is_completed;
                      return (
                        <div
                          key={l.id}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                            l.id === lessonId ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-muted'
                          }`}
                          onClick={() => navigate(`/courses/${courseId}/lessons/${l.id}`)}
                        >
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                              isCompleted
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                : l.id === lessonId
                                ? 'bg-primary-foreground text-primary'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block truncate">{l.title}</span>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              l.id === lessonId ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {l.duration_minutes || 0}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default LessonViewer;
