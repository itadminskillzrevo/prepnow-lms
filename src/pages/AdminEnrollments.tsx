import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Search, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

const AdminEnrollments: React.FC = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [userSearch, setUserSearch] = useState('');
  const [enrollmentType, setEnrollmentType] = useState<'free' | 'paid'>('free');

  // Fetch all users (students)
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['all-users', userSearch],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (userSearch) {
        query = query.or(`full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`);
      }
      
      const { data } = await query.limit(50);
      return data || [];
    },
  });

  // Fetch all courses
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['all-courses-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('*')
        .order('title');
      return data || [];
    },
  });

  // Fetch batches for selected course
  const { data: batches } = useQuery({
    queryKey: ['course-batches', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return [];
      const { data } = await supabase
        .from('batches')
        .select('*')
        .eq('course_id', selectedCourseId)
        .order('start_date');
      return data || [];
    },
    enabled: !!selectedCourseId,
  });

  // Fetch recent enrollments
  const { data: recentEnrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['recent-enrollments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses:course_id(title),
          profiles:user_id(full_name, email)
        `)
        .order('enrolled_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const enrollUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !selectedCourseId) {
        throw new Error('Please select a user and course');
      }

      // Check if enrollment already exists
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', selectedUserId)
        .eq('course_id', selectedCourseId)
        .maybeSingle();

      if (existingEnrollment) {
        throw new Error('User is already enrolled in this course');
      }

      // Get course price to determine enrollment type
      const { data: course } = await supabase
        .from('courses')
        .select('price')
        .eq('id', selectedCourseId)
        .single();

      const isFree = !course?.price || course.price === 0 || enrollmentType === 'free';

      // Create enrollment
      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          user_id: selectedUserId,
          course_id: selectedCourseId,
          batch_id: selectedBatchId && selectedBatchId !== 'none' ? selectedBatchId : null,
          payment_status: isFree ? 'none' : 'completed',
          approval_status: 'approved',
          status: 'active',
          payment_amount: isFree ? 0 : course?.price,
          payment_date: isFree ? null : new Date().toISOString(),
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        });

      if (enrollmentError) throw enrollmentError;

      // If batch selected, add to batch_enrollments
      if (selectedBatchId && selectedBatchId !== 'none') {
        const { data: existingBatchEnrollment } = await supabase
          .from('batch_enrollments')
          .select('id')
          .eq('batch_id', selectedBatchId)
          .eq('user_id', selectedUserId)
          .maybeSingle();

        if (!existingBatchEnrollment) {
          await supabase.from('batch_enrollments').insert({
            batch_id: selectedBatchId,
            user_id: selectedUserId,
            status: 'active',
          });
        }
      }

      return true;
    },
    onSuccess: () => {
      toast.success('User enrolled successfully!');
      queryClient.invalidateQueries({ queryKey: ['recent-enrollments'] });
      setSelectedUserId('');
      setSelectedCourseId('');
      setSelectedBatchId('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to enroll user');
    },
  });

  const getStatusBadge = (enrollment: any) => {
    if (enrollment.approval_status === 'approved') {
      return <Badge className="bg-success/10 text-success"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    }
    if (enrollment.approval_status === 'rejected') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  if (role !== 'admin' && role !== 'superadmin') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Manage Enrollments</h1>
          <p className="text-muted-foreground">Enroll users in courses and manage their access</p>
        </div>

        {/* Enroll User Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Enroll User
            </CardTitle>
            <CardDescription>
              Manually enroll any user in a course and optionally assign to a batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* User Selection */}
              <div className="space-y-2">
                <Label>Search User</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersLoading ? (
                      <div className="p-2 text-center text-muted-foreground">Loading...</div>
                    ) : users && users.length > 0 ? (
                      users.map((u: any) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.full_name || 'No name'} ({u.email})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-muted-foreground">No users found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Selection */}
              <div className="space-y-2">
                <Label>Select Course</Label>
                <Select value={selectedCourseId} onValueChange={(value) => {
                  setSelectedCourseId(value);
                  setSelectedBatchId('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesLoading ? (
                      <div className="p-2 text-center text-muted-foreground">Loading...</div>
                    ) : courses && courses.length > 0 ? (
                      courses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title} {c.price ? `(₹${c.price.toLocaleString('en-IN')})` : '(Free)'}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-muted-foreground">No courses found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Batch Selection */}
              <div className="space-y-2">
                <Label>Select Batch (Optional)</Label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No batch</SelectItem>
                    {batches && batches.length > 0 ? (
                      batches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({new Date(b.start_date).toLocaleDateString()})
                        </SelectItem>
                      ))
                    ) : selectedCourseId ? (
                      <div className="p-2 text-center text-muted-foreground">No batches for this course</div>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>

              {/* Enrollment Type */}
              <div className="space-y-2">
                <Label>Enrollment Type</Label>
                <Select value={enrollmentType} onValueChange={(v) => setEnrollmentType(v as 'free' | 'paid')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free Access (Skip Payment)</SelectItem>
                    <SelectItem value="paid">Mark as Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              className="mt-6"
              onClick={() => enrollUserMutation.mutate()}
              disabled={!selectedUserId || !selectedCourseId || enrollUserMutation.isPending}
            >
              {enrollUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enroll User
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Enrollments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Enrollments</CardTitle>
            <CardDescription>View the most recent course enrollments</CardDescription>
          </CardHeader>
          <CardContent>
            {enrollmentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : recentEnrollments && recentEnrollments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Enrolled At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEnrollments.map((enrollment: any) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{enrollment.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{enrollment.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{enrollment.courses?.title || 'Unknown'}</TableCell>
                      <TableCell>{getStatusBadge(enrollment)}</TableCell>
                      <TableCell>
                        <Badge variant={enrollment.payment_status === 'completed' ? 'default' : 'outline'}>
                          {enrollment.payment_status || 'none'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(enrollment.enrolled_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No enrollments yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminEnrollments;
