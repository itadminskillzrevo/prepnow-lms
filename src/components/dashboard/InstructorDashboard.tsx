import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  TrendingUp,
  DollarSign,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LiveClassSidebar } from './LiveClassSidebar';

export const InstructorDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const { data: courses } = useQuery({
    queryKey: ['instructor-courses', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', user?.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Also fetch assigned batches
  const { data: assignedBatches } = useQuery({
    queryKey: ['instructor-assigned-batches', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('batches')
        .select('id, name, course:courses(title)')
        .eq('instructor_id', user?.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: enrollmentCount } = useQuery({
    queryKey: ['instructor-enrollments', user?.id],
    queryFn: async () => {
      if (!courses || courses.length === 0) return 0;
      const courseIds = courses.map(c => c.id);
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .in('course_id', courseIds);
      return count || 0;
    },
    enabled: !!courses && courses.length > 0,
  });

  const stats = [
    {
      title: 'My Courses',
      value: courses?.length || 0,
      icon: BookOpen,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Assigned Batches',
      value: assignedBatches?.length || 0,
      icon: Users,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Total Students',
      value: enrollmentCount || 0,
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Completion Rate',
      value: '85%',
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Welcome Banner */}
        <div className="hero-banner text-white">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-white/80">Instructor Dashboard</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome, {profile?.full_name?.split(' ')[0] || 'Instructor'}!
            </h1>
            <p className="text-white/70 mb-6 max-w-lg">
              Manage your assigned batches and start live classes.
            </p>
            <Button 
              onClick={() => navigate('/admin/live-classes')}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Plus className="mr-2 h-5 w-5" />
              Manage Live Classes
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Assigned Batches */}
        <Card className="shadow-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-semibold">My Assigned Batches</CardTitle>
            <Button variant="ghost" onClick={() => navigate('/admin/batches')} className="text-primary">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {assignedBatches && assignedBatches.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {assignedBatches.slice(0, 6).map((batch: any, index: number) => (
                  <div
                    key={batch.id}
                    className="course-card p-4 animate-slide-up cursor-pointer"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => navigate(`/admin/batches/${batch.id}`)}
                  >
                    <div className="h-24 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground truncate mb-1">{batch.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {batch.course?.title || 'No course'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No batches assigned</h3>
                <p className="text-muted-foreground mt-1">
                  Contact admin to get batches assigned to you.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar - Live Classes */}
      <div className="hidden lg:block w-80 shrink-0">
        <LiveClassSidebar />
      </div>
    </div>
  );
};
