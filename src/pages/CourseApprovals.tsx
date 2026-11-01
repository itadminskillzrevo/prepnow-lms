import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatCard } from '@/components/analytics/StatCard';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  Eye,
  FileCheck,
  FileX,
  AlertCircle,
} from 'lucide-react';

const CourseApprovals: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch all courses with instructor info
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses-for-approval'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch instructor profiles separately
      if (data && data.length > 0) {
        const instructorIds = [...new Set(data.map((c: any) => c.instructor_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', instructorIds);
        
        return data.map((course: any) => ({
          ...course,
          instructor: profiles?.find((p: any) => p.user_id === course.instructor_id),
        }));
      }
      return data || [];
    },
  });

  // Filter courses by status
  const pendingCourses = courses?.filter((c: any) => c.approval_status === 'pending') || [];
  const approvedCourses = courses?.filter((c: any) => c.approval_status === 'approved') || [];
  const rejectedCourses = courses?.filter((c: any) => c.approval_status === 'rejected') || [];

  // Filter by search
  const filterCourses = (courseList: any[]) => {
    if (!searchTerm) return courseList;
    return courseList.filter(
      (c) =>
        c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.instructor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const approveMutation = useMutation({
    mutationFn: async ({ courseId, status, notes }: { courseId: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from('courses')
        .update({
          approval_status: status,
          approval_notes: notes,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          is_published: status === 'approved', // Auto-publish on approval
        })
        .eq('id', courseId);
      if (error) throw error;

      // Send notification to instructor
      const course = courses?.find((c: any) => c.id === courseId);
      if (course) {
        await supabase.from('notifications').insert({
          user_id: course.instructor_id,
          title: status === 'approved' ? 'Course Approved!' : 'Course Needs Revision',
          message: status === 'approved'
            ? `Your course "${course.title}" has been approved and is now live!`
            : `Your course "${course.title}" requires changes: ${notes}`,
          type: status === 'approved' ? 'success' : 'warning',
          link: `/courses/${courseId}/edit`,
        });
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(status === 'approved' ? 'Course approved!' : 'Course rejected');
      setSelectedCourse(null);
      setApprovalNotes('');
      queryClient.invalidateQueries({ queryKey: ['courses-for-approval'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update course');
    },
  });

  const handleApprove = () => {
    if (selectedCourse) {
      approveMutation.mutate({
        courseId: selectedCourse.id,
        status: 'approved',
        notes: approvalNotes,
      });
    }
  };

  const handleReject = () => {
    if (!approvalNotes.trim()) {
      toast.error('Please provide feedback for the instructor');
      return;
    }
    if (selectedCourse) {
      approveMutation.mutate({
        courseId: selectedCourse.id,
        status: 'rejected',
        notes: approvalNotes,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const CourseTable = ({ courseList }: { courseList: any[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Course</TableHead>
          <TableHead>Instructor</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courseList.map((course: any) => (
          <TableRow key={course.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt=""
                    className="h-12 w-16 rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-16 rounded bg-muted flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{course.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {course.difficulty_level}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <p className="text-sm">{course.instructor?.full_name || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{course.instructor?.email}</p>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{course.category || 'Uncategorized'}</Badge>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {format(new Date(course.created_at), 'MMM d, yyyy')}
              </span>
            </TableCell>
            <TableCell>{getStatusBadge(course.approval_status)}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/courses/${course.id}`, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {course.approval_status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => setSelectedCourse(course)}
                  >
                    Review
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Course Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve instructor-submitted courses
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Pending Review" value={pendingCourses.length} icon={Clock} />
          <StatCard title="Approved" value={approvedCourses.length} icon={CheckCircle} />
          <StatCard title="Rejected" value={rejectedCourses.length} icon={XCircle} />
          <StatCard title="Total Courses" value={courses?.length || 0} icon={BookOpen} />
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by course title or instructor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingCourses.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved ({approvedCourses.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejected ({rejectedCourses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Courses Pending Review</CardTitle>
                <CardDescription>
                  These courses are waiting for your approval before they can be published
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : filterCourses(pendingCourses).length > 0 ? (
                  <CourseTable courseList={filterCourses(pendingCourses)} />
                ) : (
                  <div className="text-center py-12">
                    <FileCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 font-semibold">No pending courses</h3>
                    <p className="text-muted-foreground mt-1">
                      All courses have been reviewed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle>Approved Courses</CardTitle>
              </CardHeader>
              <CardContent>
                {filterCourses(approvedCourses).length > 0 ? (
                  <CourseTable courseList={filterCourses(approvedCourses)} />
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No approved courses</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card>
              <CardHeader>
                <CardTitle>Rejected Courses</CardTitle>
              </CardHeader>
              <CardContent>
                {filterCourses(rejectedCourses).length > 0 ? (
                  <CourseTable courseList={filterCourses(rejectedCourses)} />
                ) : (
                  <div className="text-center py-12">
                    <FileX className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No rejected courses</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Course</DialogTitle>
            </DialogHeader>
            {selectedCourse && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {selectedCourse.thumbnail_url ? (
                    <img
                      src={selectedCourse.thumbnail_url}
                      alt=""
                      className="h-20 w-28 rounded object-cover"
                    />
                  ) : (
                    <div className="h-20 w-28 rounded bg-muted flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{selectedCourse.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      by {selectedCourse.instructor?.full_name}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{selectedCourse.category}</Badge>
                      <Badge variant="secondary" className="capitalize">
                        {selectedCourse.difficulty_level}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedCourse.description || 'No description provided'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Feedback / Notes {selectedCourse.approval_status === 'pending' && '(required for rejection)'}
                  </label>
                  <Textarea
                    placeholder="Provide feedback for the instructor..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Approved courses will be published immediately
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCourse(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={approveMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CourseApprovals;