import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Users, Search, GraduationCap, BookOpen, Award, Loader2 } from 'lucide-react';

interface StudentEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  status: string;
  profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  course?: {
    title: string;
  };
  progress?: number;
}

const InstructorStudents = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch instructor's courses with enrollments
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['instructor-students', user?.id],
    queryFn: async () => {
      // First get instructor's courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', user?.id);

      if (coursesError) throw coursesError;
      if (!courses || courses.length === 0) return [];

      const courseIds = courses.map(c => c.id);

      // Get enrollments for these courses
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .in('course_id', courseIds);

      if (enrollmentError) throw enrollmentError;

      // Get profiles for enrolled users
      const userIds = enrollmentData?.map(e => e.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      // Get lesson progress for calculating course progress
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('*')
        .in('user_id', userIds);

      // Map data together
      return enrollmentData?.map(enrollment => {
        const course = courses.find(c => c.id === enrollment.course_id);
        const profile = profiles?.find(p => p.user_id === enrollment.user_id);
        
        // Calculate progress (simplified)
        const userProgress = lessonProgress?.filter(
          lp => lp.user_id === enrollment.user_id && lp.is_completed
        ) || [];
        
        return {
          ...enrollment,
          course,
          profile,
          progress: userProgress.length > 0 ? Math.min(100, userProgress.length * 20) : 0
        };
      }) as StudentEnrollment[];
    },
    enabled: !!user?.id
  });

  const filteredEnrollments = enrollments?.filter(enrollment =>
    enrollment.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enrollment.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enrollment.course?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uniqueStudents = new Set(enrollments?.map(e => e.user_id)).size;
  const completedCount = enrollments?.filter(e => e.status === 'completed').length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            My Students
          </h1>
          <p className="text-muted-foreground mt-1">
            View and track students enrolled in your courses
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{uniqueStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <BookOpen className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Enrollments</p>
                  <p className="text-2xl font-bold">{enrollments?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Award className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">
                    {enrollments?.filter(e => e.status === 'active').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Enrolled Students</CardTitle>
                <CardDescription>Students enrolled in your courses</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students or courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-72"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments?.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {enrollment.profile?.avatar_url ? (
                              <img 
                                src={enrollment.profile.avatar_url} 
                                alt="" 
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-primary">
                                {enrollment.profile?.full_name?.charAt(0) || 'S'}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{enrollment.profile?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{enrollment.profile?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{enrollment.course?.title}</span>
                      </TableCell>
                      <TableCell>
                        {new Date(enrollment.enrolled_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={enrollment.progress} className="w-20 h-2" />
                          <span className="text-sm text-muted-foreground">{enrollment.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={enrollment.status === 'completed' ? 'default' : 'secondary'}>
                          {enrollment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEnrollments?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InstructorStudents;
