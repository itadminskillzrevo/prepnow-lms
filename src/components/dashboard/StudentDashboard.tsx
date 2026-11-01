import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  Trophy,
  TrendingUp,
  PlayCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LiveClassSidebar } from '@/components/dashboard/LiveClassSidebar';

export const StudentDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const { data: enrollments } = useQuery({
    queryKey: ['student-enrollments', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user?.id)
        .order('enrolled_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch lesson progress for calculating real course completion
  const { data: lessonProgress } = useQuery({
    queryKey: ['student-lesson-progress', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lesson_progress')
        .select('lesson_id, is_completed, progress_percent')
        .eq('user_id', user!.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch all lessons grouped by course via modules
  const courseIds = enrollments?.map(e => e.course_id) || [];
  const { data: courseLessons } = useQuery({
    queryKey: ['course-lessons-count', courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return {};
      const { data: modules } = await supabase
        .from('modules')
        .select('id, course_id')
        .in('course_id', courseIds);
      if (!modules || modules.length === 0) return {};
      const moduleIds = modules.map(m => m.id);
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, module_id')
        .in('module_id', moduleIds);
      // Build course -> lesson ids map
      const moduleToCoure = Object.fromEntries(modules.map(m => [m.id, m.course_id]));
      const result: Record<string, string[]> = {};
      (lessons || []).forEach(l => {
        const cId = moduleToCoure[l.module_id];
        if (cId) {
          if (!result[cId]) result[cId] = [];
          result[cId].push(l.id);
        }
      });
      return result;
    },
    enabled: courseIds.length > 0,
  });

  const getCourseProgress = (courseId: string): number => {
    const lessonIds = courseLessons?.[courseId];
    if (!lessonIds || lessonIds.length === 0) return 0;
    const completedCount = lessonIds.filter(lid =>
      lessonProgress?.some(lp => lp.lesson_id === lid && lp.is_completed)
    ).length;
    return Math.round((completedCount / lessonIds.length) * 100);
  };

  const completedCount = enrollments?.filter(e => e.completed_at).length || 0;
  const totalEnrolled = enrollments?.length || 0;
  const progressRate = totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0;

  const stats = [
    {
      title: 'Enrolled Courses',
      value: totalEnrolled,
      icon: BookOpen,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Hours Learned',
      value: 0,
      icon: Clock,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Completed',
      value: completedCount,
      icon: Trophy,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Progress Rate',
      value: `${progressRate}%`,
      icon: TrendingUp,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
  ];

  return (
    <div className="flex gap-6">
      {/* Main Content Area */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Welcome Banner */}
        <div className="hero-banner text-white">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-white/80">Welcome back</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              Hello, {profile?.full_name?.split(' ')[0] || 'Student'}!
            </h1>
            <p className="text-white/70 mb-6 max-w-lg">
              Ready to continue your learning journey? Pick up where you left off and keep building your skills.
            </p>
            <Button 
              onClick={() => navigate('/courses')}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Browse Courses
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div 
              key={stat.title} 
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1 text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Learning */}
        <Card className="shadow-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-semibold">Continue Learning</CardTitle>
            <Button variant="ghost" onClick={() => navigate('/my-courses')} className="text-primary">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {enrollments && enrollments.length > 0 ? (
              <div className="space-y-3">
                {enrollments.slice(0, 3).map((enrollment: any, index: number) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => navigate(`/courses/${enrollment.course_id}`)}
                  >
                    <div className="h-16 w-24 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0">
                      {enrollment.course?.thumbnail_url ? (
                        <img
                          src={enrollment.course.thumbnail_url}
                          alt={enrollment.course.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {enrollment.course?.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {enrollment.course?.category || 'General'}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={getCourseProgress(enrollment.course_id)} className="flex-1 h-2" />
                        <span className="text-sm font-medium text-muted-foreground">{getCourseProgress(enrollment.course_id)}%</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Continue
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No courses yet</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  Start your learning journey by enrolling in a course.
                </p>
                <Button onClick={() => navigate('/courses')}>
                  Browse Courses
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Fixed Right Sidebar - Live Classes */}
      <aside className="hidden lg:block w-72 xl:w-80 shrink-0 min-w-0 sticky top-24 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto overflow-x-hidden">
        <LiveClassSidebar />
      </aside>
    </div>
  );
};
