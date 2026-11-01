import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, endOfWeek, format, subDays } from 'date-fns';

export const useUserAnalytics = (days: number = 30) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-analytics', user?.id, days],
    queryFn: async () => {
      if (!user) return null;

      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCourseAnalytics = (courseId: string, days: number = 30) => {
  return useQuery({
    queryKey: ['course-analytics', courseId, days],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('course_analytics')
        .select('*')
        .eq('course_id', courseId)
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
};

export const useInstructorAnalytics = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['instructor-analytics', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get instructor's courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', user.id);

      if (!courses?.length) return { courses: [], totals: null };

      const courseIds = courses.map(c => c.id);
      
      // Get analytics for all courses
      const { data: analytics } = await supabase
        .from('course_analytics')
        .select('*')
        .in('course_id', courseIds)
        .gte('date', format(subDays(new Date(), 30), 'yyyy-MM-dd'));

      // Get enrollment counts
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, user_id')
        .in('course_id', courseIds);

      // Aggregate data
      const totals = {
        totalViews: analytics?.reduce((sum, a) => sum + (a.views || 0), 0) || 0,
        totalEnrollments: enrollments?.length || 0,
        totalCompletions: analytics?.reduce((sum, a) => sum + (a.completions || 0), 0) || 0,
        avgProgress: analytics?.length 
          ? analytics.reduce((sum, a) => sum + (Number(a.avg_progress) || 0), 0) / analytics.length 
          : 0,
      };

      return { courses, analytics, totals };
    },
    enabled: !!user,
  });
};

export const useAdminAnalytics = () => {
  return useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total courses
      const { count: totalCourses } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });

      // Get total enrollments
      const { count: totalEnrollments } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true });

      // Get active users (with analytics in last 7 days)
      const { count: activeUsers } = await supabase
        .from('user_analytics')
        .select('*', { count: 'exact', head: true })
        .gte('date', format(subDays(new Date(), 7), 'yyyy-MM-dd'));

      // Get course analytics
      const { data: courseAnalytics } = await supabase
        .from('course_analytics')
        .select('*')
        .gte('date', startDate);

      // Get user analytics
      const { data: userAnalytics } = await supabase
        .from('user_analytics')
        .select('*')
        .gte('date', startDate);

      return {
        totalUsers: totalUsers || 0,
        totalCourses: totalCourses || 0,
        totalEnrollments: totalEnrollments || 0,
        activeUsers: activeUsers || 0,
        courseAnalytics,
        userAnalytics,
      };
    },
  });
};

export const useTrackAnalytics = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      timeSpent?: number;
      lessonCompleted?: boolean;
      quizTaken?: boolean;
      assignmentSubmitted?: boolean;
    }) => {
      if (!user) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get or create today's analytics
      const { data: existing } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      const updates = {
        user_id: user.id,
        date: today,
        time_spent_minutes: (existing?.time_spent_minutes || 0) + (data.timeSpent || 0),
        lessons_completed: (existing?.lessons_completed || 0) + (data.lessonCompleted ? 1 : 0),
        quizzes_taken: (existing?.quizzes_taken || 0) + (data.quizTaken ? 1 : 0),
        assignments_submitted: (existing?.assignments_submitted || 0) + (data.assignmentSubmitted ? 1 : 0),
        login_count: existing?.login_count || 1,
      };

      const { error } = await supabase
        .from('user_analytics')
        .upsert(updates, { onConflict: 'user_id,date' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-analytics'] });
    },
  });
};
