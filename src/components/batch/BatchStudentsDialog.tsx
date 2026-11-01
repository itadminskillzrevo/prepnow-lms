import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, UserPlus, Trash2, Search, Users, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

interface BatchStudentsDialogProps {
  batch: {
    id: string;
    name: string;
    course_id: string;
    max_students: number;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BatchEnrollment {
  id: string;
  user_id: string;
  batch_id: string;
  enrolled_at: string;
  status: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

interface AvailableStudent {
  user_id: string;
  full_name: string | null;
  email: string;
}

export const BatchStudentsDialog: React.FC<BatchStudentsDialogProps> = ({
  batch,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableSearchTerm, setAvailableSearchTerm] = useState('');
  const [enrollInCourse, setEnrollInCourse] = useState(true);

  // Fetch current batch enrollments
  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['batch-enrollments', batch?.id],
    queryFn: async () => {
      if (!batch?.id) return [];
      
      const { data, error } = await supabase
        .from('batch_enrollments')
        .select('*')
        .eq('batch_id', batch.id)
        .order('enrolled_at', { ascending: false });
      
      if (error) throw error;

      // Fetch profiles for enrolled users
      if (data && data.length > 0) {
        const userIds = data.map(e => e.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        return data.map(enrollment => ({
          ...enrollment,
          profile: profiles?.find(p => p.user_id === enrollment.user_id),
        })) as BatchEnrollment[];
      }

      return data as BatchEnrollment[];
    },
    enabled: !!batch?.id && open,
  });

  // Fetch all students (with student role) who are not already in this batch
  const { data: availableStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ['available-students-all', batch?.id],
    queryFn: async () => {
      if (!batch?.id) return [];

      // Get all users with student role
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;
      if (!studentRoles || studentRoles.length === 0) return [];

      // Get students already in this batch
      const { data: batchEnrollments } = await supabase
        .from('batch_enrollments')
        .select('user_id')
        .eq('batch_id', batch.id);

      const batchUserIds = batchEnrollments?.map(e => e.user_id) || [];
      const availableUserIds = studentRoles
        .map(r => r.user_id)
        .filter(id => !batchUserIds.includes(id));

      if (availableUserIds.length === 0) return [];

      // Get profiles for available students
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', availableUserIds)
        .order('full_name');

      if (profileError) throw profileError;

      return profiles as AvailableStudent[];
    },
    enabled: !!batch?.id && open,
  });

  // Add multiple students to batch mutation
  const addStudentsMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (!batch?.id || !batch?.course_id) throw new Error('No batch selected');

      // Add to batch_enrollments
      const batchEnrollmentsData = userIds.map(userId => ({
        batch_id: batch.id,
        user_id: userId,
        status: 'active',
      }));

      const { error: batchError } = await supabase
        .from('batch_enrollments')
        .insert(batchEnrollmentsData);

      if (batchError) throw batchError;

      // Also enroll in course if checkbox is checked
      if (enrollInCourse) {
        // Check which students are not already enrolled in the course
        const { data: existingEnrollments } = await supabase
          .from('enrollments')
          .select('user_id')
          .eq('course_id', batch.course_id)
          .in('user_id', userIds);

        const existingUserIds = existingEnrollments?.map(e => e.user_id) || [];
        const newEnrollments = userIds
          .filter(id => !existingUserIds.includes(id))
          .map(userId => ({
            course_id: batch.course_id,
            user_id: userId,
            approval_status: 'approved',
            batch_id: batch.id,
          }));

        if (newEnrollments.length > 0) {
          const { error: enrollError } = await supabase
            .from('enrollments')
            .insert(newEnrollments);

          if (enrollError) throw enrollError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-enrollments', batch?.id] });
      queryClient.invalidateQueries({ queryKey: ['available-students-all', batch?.id] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success(`${selectedStudents.length} student(s) added to batch successfully`);
      setSelectedStudents([]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove student from batch mutation
  const removeStudentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('batch_enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-enrollments', batch?.id] });
      queryClient.invalidateQueries({ queryKey: ['available-students-all', batch?.id] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Student removed from batch');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update enrollment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ enrollmentId, status }: { enrollmentId: string; status: string }) => {
      const { error } = await supabase
        .from('batch_enrollments')
        .update({ status })
        .eq('id', enrollmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-enrollments', batch?.id] });
      toast.success('Status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredEnrollments = enrollments?.filter(e => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      e.profile?.full_name?.toLowerCase().includes(search) ||
      e.profile?.email.toLowerCase().includes(search)
    );
  });

  const filteredAvailableStudents = availableStudents?.filter(s => {
    if (!availableSearchTerm) return true;
    const search = availableSearchTerm.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(search) ||
      s.email.toLowerCase().includes(search)
    );
  });

  const handleSelectStudent = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, userId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredAvailableStudents) {
      const maxCanAdd = batch ? batch.max_students - (enrollments?.length || 0) : 0;
      const studentsToAdd = filteredAvailableStudents.slice(0, maxCanAdd).map(s => s.user_id);
      setSelectedStudents(studentsToAdd);
    } else {
      setSelectedStudents([]);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      pending: 'secondary',
      completed: 'outline',
      dropped: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const currentCount = enrollments?.length || 0;
  const isFull = batch ? currentCount >= batch.max_students : false;
  const remainingSlots = batch ? batch.max_students - currentCount : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Students - {batch?.name}
          </DialogTitle>
          <DialogDescription>
            Add or remove students from this batch. Current: {currentCount}/{batch?.max_students || 0} students
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Add Students Section with Checkboxes */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Add Students to Batch</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enrollInCourse"
                  checked={enrollInCourse}
                  onCheckedChange={(checked) => setEnrollInCourse(checked as boolean)}
                />
                <Label htmlFor="enrollInCourse" className="text-sm cursor-pointer flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  Also enroll in course
                </Label>
              </div>
            </div>

            {/* Search available students */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search available students..."
                value={availableSearchTerm}
                onChange={(e) => setAvailableSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {loadingStudents ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredAvailableStudents && filteredAvailableStudents.length > 0 ? (
              <>
                <div className="border rounded-lg max-h-48 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedStudents.length > 0 && selectedStudents.length === Math.min(filteredAvailableStudents.length, remainingSlots)}
                            onCheckedChange={handleSelectAll}
                            disabled={isFull}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAvailableStudents.map((student) => {
                        const isSelected = selectedStudents.includes(student.user_id);
                        const canSelect = !isFull && (isSelected || selectedStudents.length < remainingSlots);
                        return (
                          <TableRow key={student.user_id}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectStudent(student.user_id, checked as boolean)}
                                disabled={!canSelect && !isSelected}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {student.full_name || 'No Name'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {student.email}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedStudents.length} selected ({remainingSlots} slots remaining)
                  </span>
                  <Button
                    onClick={() => addStudentsMutation.mutate(selectedStudents)}
                    disabled={selectedStudents.length === 0 || addStudentsMutation.isPending}
                    className="gap-1"
                  >
                    {addStudentsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Add {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isFull ? 'Batch is full' : 'No students available to add'}
              </p>
            )}
          </div>

          {/* Search enrolled students */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search enrolled students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Enrolled Students List */}
          {loadingEnrollments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredEnrollments && filteredEnrollments.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">
                        {enrollment.profile?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {enrollment.profile?.email || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(enrollment.enrolled_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={enrollment.status}
                          onValueChange={(status) => 
                            updateStatusMutation.mutate({ enrollmentId: enrollment.id, status })
                          }
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="dropped">Dropped</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Remove this student from the batch?')) {
                              removeStudentMutation.mutate(enrollment.id);
                            }
                          }}
                          disabled={removeStudentMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg bg-muted/20">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No students match your search' : 'No students enrolled in this batch yet'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
