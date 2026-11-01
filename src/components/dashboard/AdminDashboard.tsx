import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BookOpen,
  Users,
  GraduationCap,
  Plus,
  ArrowRight,
  Shield,
  Activity,
  Sparkles,
  Settings,
  BarChart3,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const AdminDashboard: React.FC = () => {
  const { role, profile } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [courses, profiles, enrollments] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }),
      ]);

      return {
        totalCourses: courses.count || 0,
        totalUsers: profiles.count || 0,
        totalEnrollments: enrollments.count || 0,
      };
    },
  });

  const { data: recentUsers } = useQuery({
    queryKey: ['recent-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: allCourses } = useQuery({
    queryKey: ['admin-all-courses'],
    queryFn: async () => {
      // First fetch courses
      const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (!courses || courses.length === 0) return [];
      
      // Fetch instructor profiles separately
      const instructorIds = [...new Set(courses.map(c => c.instructor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', instructorIds);
      
      // Map profiles to courses
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      return courses.map(course => ({
        ...course,
        profiles: { full_name: profileMap.get(course.instructor_id) || 'Unknown' }
      }));
    },
  });

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Courses',
      value: stats?.totalCourses || 0,
      icon: BookOpen,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Enrollments',
      value: stats?.totalEnrollments || 0,
      icon: GraduationCap,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Active Today',
      value: '12',
      icon: Activity,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
  ];

  const quickActions = [
    { label: 'Manage Users', icon: Users, path: '/admin/users', color: 'bg-primary hover:bg-primary/90' },
    { label: 'Create Course', icon: Plus, path: '/courses/create', color: 'bg-accent hover:bg-accent/90' },
    { label: 'Analytics', icon: BarChart3, path: '/admin/analytics', variant: 'outline' as const },
    { label: 'Settings', icon: Settings, path: '/admin/settings', variant: 'outline' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="hero-banner text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            {role === 'superadmin' && <Shield className="h-5 w-5 text-accent" />}
            <Sparkles className="h-5 w-5 text-accent" />
            <span className="text-sm font-medium text-white/80">
              {role === 'superadmin' ? 'Super Admin' : 'Admin'} Dashboard
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Admin'}!
          </h1>
          <p className="text-white/70 mb-6 max-w-lg">
            Manage users, courses, and monitor platform activity from your central hub.
          </p>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant || 'default'}
                onClick={() => navigate(action.path)}
                className={action.color ? `${action.color} text-white` : 'border-white/30 text-white hover:bg-white/10'}
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* All Courses */}
        <Card className="shadow-card border-border lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-semibold">All Courses</CardTitle>
            <Button variant="ghost" onClick={() => navigate('/courses')} className="text-primary">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {allCourses && allCourses.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {allCourses.slice(0, 4).map((course: any, index: number) => (
                  <div
                    key={course.id}
                    className="course-card p-4 animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => navigate(`/courses/${course.id}`)}
                  >
                    <div className="h-24 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3 overflow-hidden">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BookOpen className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground truncate text-sm">{course.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {course.profiles?.full_name || 'Unknown'}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={course.is_published ? 'badge-published' : 'badge-draft'}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No courses yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="shadow-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-semibold">Recent Users</CardTitle>
            <Button variant="ghost" onClick={() => navigate('/admin/users')} className="text-primary text-sm">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers?.map((user: any, index: number) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Avatar className="h-10 w-10 border-2 border-primary/10">
                    <AvatarImage src={user.avatar_url || ''} alt={user.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {user.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {user.full_name || 'Unnamed User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {(!recentUsers || recentUsers.length === 0) && (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No users yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
