import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Users, Calendar, BookOpen, Loader2, Layers } from 'lucide-react';
import { BatchStudentsDialog } from '@/components/batch/BatchStudentsDialog';
import { useNavigate } from 'react-router-dom';

interface Batch {
  id: string;
  course_id: string;
  curriculum_id: string | null;
  instructor_id: string | null;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  max_students: number;
  status: string;
  created_by: string;
  created_at: string;
  course?: { title: string };
  curriculum?: { name: string } | null;
  instructor?: { full_name: string } | null;
  enrollment_count?: number;
}

interface BatchFormData {
  course_id: string;
  instructor_id: string;
  batchName: string;
  curriculumName: string;
  description: string;
  start_date: string;
  end_date: string;
  max_students: number;
  status: string;
}

const BatchManagement: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isAdminOrSuperAdmin = role === 'admin' || role === 'superadmin';
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [managingStudentsBatch, setManagingStudentsBatch] = useState<Batch | null>(null);

  const [formData, setFormData] = useState<BatchFormData>({
    course_id: '',
    instructor_id: '',
    batchName: '',
    curriculumName: '',
    description: '',
    start_date: '',
    end_date: '',
    max_students: 50,
    status: 'upcoming',
  });

  // Fetch instructors for dropdown (Admin/SuperAdmin only)
  const { data: instructors } = useQuery({
    queryKey: ['instructors-for-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'instructor');
      if (error) throw error;
      
      const instructorIds = data?.map(r => r.user_id) || [];
      if (instructorIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', instructorIds);
      
      return profiles || [];
    },
    enabled: isAdminOrSuperAdmin,
  });

  // Fetch courses for dropdown
  const { data: courses } = useQuery({
    queryKey: ['courses-for-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('is_published', true)
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  // Fetch batches
  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          course:courses(title),
          curriculum:curriculums(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get enrollment counts
      const batchIds = data.map(b => b.id);
      const { data: enrollments } = await supabase
        .from('batch_enrollments')
        .select('batch_id')
        .in('batch_id', batchIds);

      const enrollmentCounts = batchIds.reduce((acc, id) => {
        acc[id] = enrollments?.filter(e => e.batch_id === id).length || 0;
        return acc;
      }, {} as Record<string, number>);

      // Get instructor profiles for batches with instructor_id
      const instructorIds = data.filter(b => b.instructor_id).map(b => b.instructor_id);
      let instructorMap: Record<string, string> = {};
      if (instructorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', instructorIds);
        instructorMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.full_name || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }

      return data.map(batch => ({
        ...batch,
        enrollment_count: enrollmentCounts[batch.id] || 0,
        instructor: batch.instructor_id ? { full_name: instructorMap[batch.instructor_id] || 'Unknown' } : null,
      })) as Batch[];
    },
  });

  // Create batch mutation (creates curriculum first, then batch)
  const createBatchMutation = useMutation({
    mutationFn: async (data: BatchFormData) => {
      if (!user?.id) throw new Error('Please sign in again');
      if (!data.course_id) throw new Error('Course is required');
      if (!data.batchName) throw new Error('Batch name is required');
      if (!data.curriculumName) throw new Error('Curriculum name is required');

      // Step 1: Create the curriculum first
      const { data: curriculum, error: curriculumError } = await supabase
        .from('curriculums')
        .insert({
          name: data.curriculumName,
          description: `Curriculum for batch: ${data.batchName}`,
          created_by: user.id,
          status: 'draft',
        })
        .select('id')
        .single();

      if (curriculumError) throw curriculumError;

      // Step 2: Create the batch linked to curriculum and course
      const { error: batchError } = await supabase
        .from('batches')
        .insert({
          course_id: data.course_id,
          curriculum_id: curriculum.id,
          instructor_id: data.instructor_id || null,
          name: data.batchName,
          description: data.description || null,
          start_date: data.start_date,
          end_date: data.end_date || null,
          max_students: data.max_students,
          status: data.status,
          created_by: user.id,
        });

      if (batchError) throw batchError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch and curriculum created successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update batch mutation
  const updateBatchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BatchFormData> }) => {
      const { error } = await supabase
        .from('batches')
        .update({
          course_id: data.course_id,
          instructor_id: data.instructor_id || null,
          name: data.batchName,
          description: data.description || null,
          start_date: data.start_date,
          end_date: data.end_date || null,
          max_students: data.max_students,
          status: data.status,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch updated successfully');
      setIsDialogOpen(false);
      setEditingBatch(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('batches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      course_id: '',
      instructor_id: '',
      batchName: '',
      curriculumName: '',
      description: '',
      start_date: '',
      end_date: '',
      max_students: 50,
      status: 'upcoming',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBatch) {
      updateBatchMutation.mutate({ id: editingBatch.id, data: formData });
    } else {
      createBatchMutation.mutate(formData);
    }
  };

  const handleEdit = (batch: Batch) => {
    setFormData({
      course_id: batch.course_id,
      instructor_id: batch.instructor_id || '',
      batchName: batch.name,
      curriculumName: batch.curriculum?.name || '',
      description: batch.description || '',
      start_date: batch.start_date,
      end_date: batch.end_date || '',
      max_students: batch.max_students,
      status: batch.status,
    });
    setEditingBatch(batch);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      upcoming: 'secondary',
      active: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const handleInputChange = (field: keyof BatchFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Stats
  const totalBatches = batches?.length || 0;
  const activeBatches = batches?.filter(b => b.status === 'active').length || 0;
  const upcomingBatches = batches?.filter(b => b.status === 'upcoming').length || 0;
  const totalEnrollments = batches?.reduce((sum, b) => sum + (b.enrollment_count || 0), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Batch Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create batches with their own curriculum linked to a course
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setIsDialogOpen(false);
              setEditingBatch(null);
              resetForm();
            } else {
              setIsDialogOpen(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingBatch ? 'Edit Batch' : 'Create New Batch'}</DialogTitle>
                <DialogDescription>
                  {editingBatch 
                    ? 'Update the batch details below.' 
                    : 'Create a batch with its own curriculum linked to a course.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Batch and Curriculum Names */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="batchName" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Batch Name *
                    </Label>
                    <Input
                      id="batchName"
                      value={formData.batchName}
                      onChange={(e) => handleInputChange('batchName', e.target.value)}
                      placeholder="e.g., January 2026 Batch"
                      required
                    />
                  </div>

                  {!editingBatch && (
                    <div className="space-y-2">
                      <Label htmlFor="curriculumName" className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        Curriculum Name *
                      </Label>
                      <Input
                        id="curriculumName"
                        value={formData.curriculumName}
                        onChange={(e) => handleInputChange('curriculumName', e.target.value)}
                        placeholder="e.g., Jan 2026 Curriculum"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Course *</Label>
                  <Select value={formData.course_id} onValueChange={(value) => handleInputChange('course_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Instructor Assignment (Admin/SuperAdmin only) */}
                {isAdminOrSuperAdmin && (
                  <div className="space-y-2">
                    <Label>Assign Instructor</Label>
                    <Select 
                      value={formData.instructor_id || 'none'} 
                      onValueChange={(value) => handleInputChange('instructor_id', value === 'none' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an instructor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Instructor</SelectItem>
                        {instructors?.map((instructor) => (
                          <SelectItem key={instructor.user_id} value={instructor.user_id}>
                            {instructor.full_name || 'Unknown'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of this batch..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_students">Max Students</Label>
                    <Input
                      id="max_students"
                      type="number"
                      min="1"
                      value={formData.max_students}
                      onChange={(e) => handleInputChange('max_students', parseInt(e.target.value) || 50)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createBatchMutation.isPending || updateBatchMutation.isPending}>
                    {(createBatchMutation.isPending || updateBatchMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingBatch ? 'Update' : 'Create Batch & Curriculum'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBatches}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeBatches}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingBatches}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEnrollments}</div>
            </CardContent>
          </Card>
        </div>

        {/* Batches Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Batches</CardTitle>
            <CardDescription>Manage your course batches and their curriculums</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : batches && batches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Curriculum</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow 
                      key={batch.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/batches/${batch.id}`)}
                    >
                      <TableCell className="font-medium">{batch.name}</TableCell>
                      <TableCell>{batch.course?.title || 'N/A'}</TableCell>
                      <TableCell>
                        {batch.instructor?.full_name || <span className="text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell>
                        {batch.curriculum ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto font-normal"
                            onClick={() => navigate(`/admin/curriculum/${batch.curriculum_id}/edit`)}
                          >
                            <Layers className="h-3 w-3 mr-1" />
                            {batch.curriculum.name}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(batch.start_date), 'MMM d, yyyy')}
                        {batch.end_date && ` - ${format(new Date(batch.end_date), 'MMM d, yyyy')}`}
                      </TableCell>
                      <TableCell>{batch.enrollment_count} / {batch.max_students}</TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => setManagingStudentsBatch(batch)} title="Quick manage students">
                            <Users className="h-4 w-4" />
                          </Button>
                          {isAdminOrSuperAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/batches/${batch.id}/students`)} title="Students dashboard">
                              <Users className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(batch)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdminOrSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteBatchMutation.mutate(batch.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No batches created yet</p>
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Batch
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Students Dialog */}
      {managingStudentsBatch && (
        <BatchStudentsDialog
          batch={managingStudentsBatch}
          open={!!managingStudentsBatch}
          onOpenChange={(open) => !open && setManagingStudentsBatch(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default BatchManagement;
