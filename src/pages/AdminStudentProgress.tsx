import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/analytics/StatCard';
import { format } from 'date-fns';
import {
  Search,
  Users,
  GraduationCap,
  TrendingUp,
  Award,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const AdminStudentProgress: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Fetch all enrollments with student and course data
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['admin-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(id, title, instructor_id)
        `)
        .order('enrolled_at', { ascending: false });
      if (error) throw error;
      
      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((e: any) => e.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url')
          .in('user_id', userIds);
        
        // Map profiles to enrollments
        return data.map((enrollment: any) => ({
          ...enrollment,
          profile: profiles?.find((p: any) => p.user_id === enrollment.user_id),
        }));
      }
      return data || [];
    },
  });

  // Fetch all courses for filter
  const { data: courses } = useQuery({
    queryKey: ['all-courses-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      return data || [];
    },
  });

  // Fetch all lessons grouped by course
  const { data: courseLessons } = useQuery({
    queryKey: ['all-course-lessons'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lessons')
        .select('id, module_id, modules!inner(course_id)');
      return data || [];
    },
  });

  // Fetch lesson progress for all users
  const { data: progressData } = useQuery({
    queryKey: ['all-lesson-progress'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id, is_completed, progress_percent');
      return data || [];
    },
  });

  // Build a map of course_id -> lesson_ids
  const courseLessonMap = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    courseLessons?.forEach((lesson: any) => {
      const courseId = lesson.modules?.course_id;
      if (courseId) {
        if (!map[courseId]) map[courseId] = [];
        map[courseId].push(lesson.id);
      }
    });
    return map;
  }, [courseLessons]);

  // Calculate stats
  const totalEnrollments = enrollments?.length || 0;
  const completedEnrollments = enrollments?.filter((e: any) => e.completed_at)?.length || 0;
  const activeEnrollments = enrollments?.filter((e: any) => e.status === 'active' && !e.completed_at)?.length || 0;
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  // Filter and search
  const filteredEnrollments = enrollments?.filter((enrollment: any) => {
    const matchesSearch =
      enrollment.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.course?.title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse = courseFilter === 'all' || enrollment.course_id === courseFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && enrollment.completed_at) ||
      (statusFilter === 'active' && !enrollment.completed_at);

    return matchesSearch && matchesCourse && matchesStatus;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredEnrollments.length / pageSize);
  const paginatedEnrollments = filteredEnrollments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate accurate progress for each enrollment based on course lessons
  const getStudentProgress = (userId: string, courseId: string) => {
    const lessonIds = courseLessonMap[courseId] || [];
    if (lessonIds.length === 0) return 0;

    const userProgress = progressData?.filter(
      (p: any) => p.user_id === userId && lessonIds.includes(p.lesson_id)
    ) || [];
    
    const completedLessons = userProgress.filter((p: any) => p.is_completed).length;
    return Math.round((completedLessons / lessonIds.length) * 100);
  };

  // Get lessons completed count
  const getLessonsCompleted = (userId: string, courseId: string) => {
    const lessonIds = courseLessonMap[courseId] || [];
    const userProgress = progressData?.filter(
      (p: any) => p.user_id === userId && lessonIds.includes(p.lesson_id) && p.is_completed
    ) || [];
    return { completed: userProgress.length, total: lessonIds.length };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Student Progress</h1>
            <p className="text-muted-foreground mt-1">
              Monitor student enrollments and track course completion rates
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Enrollments" value={totalEnrollments} icon={Users} />
          <StatCard title="Active Students" value={activeEnrollments} icon={TrendingUp} />
          <StatCard title="Completed" value={completedEnrollments} icon={Award} />
          <StatCard title="Completion Rate" value={`${completionRate}%`} icon={GraduationCap} />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name, email, or course..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={courseFilter}
                onValueChange={(value) => {
                  setCourseFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-64">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses?.map((course: any) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Progress Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Enrollment Details
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredEnrollments.length} results)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : paginatedEnrollments.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Lessons</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEnrollments.map((enrollment: any) => {
                      const progress = enrollment.completed_at ? 100 : getStudentProgress(enrollment.user_id, enrollment.course_id);
                      const lessons = getLessonsCompleted(enrollment.user_id, enrollment.course_id);
                      return (
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
                                  <span className="text-sm font-semibold text-primary">
                                    {enrollment.profile?.full_name?.charAt(0) || 'U'}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {enrollment.profile?.full_name || 'Unknown'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {enrollment.profile?.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{enrollment.course?.title || 'Unknown Course'}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-[150px]">
                              <Progress value={progress} className="flex-1 h-2" />
                              <span className="text-sm font-medium w-10">{progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {lessons.completed}/{lessons.total}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(enrollment.enrolled_at), 'MMM d, yyyy')}
                            </span>
                          </TableCell>
                          <TableCell>
                            {enrollment.completed_at ? (
                              <Badge variant="default" className="bg-success text-success-foreground">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="secondary">In Progress</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1} to{' '}
                      {Math.min(currentPage * pageSize, filteredEnrollments.length)} of{' '}
                      {filteredEnrollments.length} results
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No enrollments found</h3>
                <p className="text-muted-foreground mt-1">
                  {searchTerm || courseFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Students will appear here when they enroll in courses'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminStudentProgress;