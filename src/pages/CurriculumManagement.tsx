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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, Search, Edit, Plus, Trash2, Layers, AlertTriangle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Curriculum {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CurriculumUsage {
  course_count: number;
  batch_count: number;
}

const CurriculumManagement: React.FC = () => {
  const { user, role } = useAuth();
  const isAdminOrSuperAdmin = role === 'admin' || role === 'superadmin';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [deletingCurriculum, setDeletingCurriculum] = useState<Curriculum | null>(null);
  const [deletionUsage, setDeletionUsage] = useState<CurriculumUsage | null>(null);
  const [curriculumForm, setCurriculumForm] = useState({ name: '', description: '' });

  // Fetch curriculums
  const { data: curriculums, isLoading } = useQuery({
    queryKey: ['curriculums', user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from('curriculums')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (role === 'instructor') {
        query = query.eq('created_by', user?.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Curriculum[];
    },
  });

  // Create curriculum mutation
  const createCurriculumMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const { error } = await supabase.from('curriculums').insert({
        name: data.name,
        description: data.description || null,
        created_by: user?.id,
        status: 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculums'] });
      toast.success('Curriculum created successfully');
      setIsDialogOpen(false);
      setCurriculumForm({ name: '', description: '' });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Update curriculum mutation
  const updateCurriculumMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description: string } }) => {
      const { error } = await supabase
        .from('curriculums')
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculums'] });
      toast.success('Curriculum updated successfully');
      setIsDialogOpen(false);
      setEditingCurriculum(null);
      setCurriculumForm({ name: '', description: '' });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Delete curriculum mutation
  const deleteCurriculumMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('curriculums').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculums'] });
      toast.success('Curriculum deleted successfully');
      setDeletingCurriculum(null);
      setDeletionUsage(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleEdit = (curriculum: Curriculum) => {
    setEditingCurriculum(curriculum);
    setCurriculumForm({ name: curriculum.name, description: curriculum.description || '' });
    setIsDialogOpen(true);
  };

  const handleDeleteCheck = async (curriculum: Curriculum) => {
    // Check usage before deletion
    const { data: usage, error } = await supabase.rpc('get_curriculum_usage', {
      p_curriculum_id: curriculum.id
    });
    
    if (error) {
      toast.error('Failed to check curriculum usage');
      return;
    }
    
    setDeletingCurriculum(curriculum);
    setDeletionUsage(usage?.[0] || { course_count: 0, batch_count: 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCurriculum) {
      updateCurriculumMutation.mutate({ id: editingCurriculum.id, data: curriculumForm });
    } else {
      createCurriculumMutation.mutate(curriculumForm);
    }
  };

  const filteredCurriculums = curriculums?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      active: 'default',
      draft: 'secondary',
    };
    return <Badge variant={variants[status || 'draft'] || 'outline'}>{status || 'draft'}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Curriculum Management
            </h1>
            <p className="text-muted-foreground mt-1">
              View, edit, and delete curriculums independently
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setIsDialogOpen(false);
              setEditingCurriculum(null);
              setCurriculumForm({ name: '', description: '' });
            } else {
              setIsDialogOpen(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Curriculum
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCurriculum ? 'Edit Curriculum' : 'Create Curriculum'}</DialogTitle>
                <DialogDescription>
                  {editingCurriculum 
                    ? 'Update the curriculum details below.' 
                    : 'Create a new standalone curriculum.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Curriculum Name *</Label>
                  <Input
                    id="name"
                    value={curriculumForm.name}
                    onChange={(e) => setCurriculumForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Web Development Fundamentals"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={curriculumForm.description}
                    onChange={(e) => setCurriculumForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of what this curriculum covers..."
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!curriculumForm.name || createCurriculumMutation.isPending || updateCurriculumMutation.isPending}
                  >
                    {(createCurriculumMutation.isPending || updateCurriculumMutation.isPending) ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingCurriculum ? 'Update' : 'Create'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search curriculums..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Curriculums Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Curriculums</CardTitle>
            <CardDescription>Manage curriculums linked to courses and batches</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCurriculums && filteredCurriculums.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCurriculums.map((curriculum) => (
                    <TableRow key={curriculum.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-primary" />
                          {curriculum.name}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {curriculum.description || '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(curriculum.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(curriculum.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/curriculum/${curriculum.id}/edit`)}
                            title="View/Edit Content"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(curriculum)}
                            title="Edit Details"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdminOrSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCheck(curriculum)}
                              className="text-destructive hover:text-destructive"
                              title="Delete"
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
                <Layers className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No curriculums found</p>
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Curriculum
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCurriculum} onOpenChange={(open) => !open && setDeletingCurriculum(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {(deletionUsage?.course_count || 0) > 0 || (deletionUsage?.batch_count || 0) > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Curriculum In Use
                </>
              ) : (
                'Delete Curriculum'
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(deletionUsage?.course_count || 0) > 0 || (deletionUsage?.batch_count || 0) > 0 ? (
                <div className="space-y-2">
                  <p>This curriculum is currently linked to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {(deletionUsage?.course_count || 0) > 0 && (
                      <li><strong>{deletionUsage?.course_count}</strong> course(s)</li>
                    )}
                    {(deletionUsage?.batch_count || 0) > 0 && (
                      <li><strong>{deletionUsage?.batch_count}</strong> batch(es)</li>
                    )}
                  </ul>
                  <p className="text-destructive font-medium mt-3">
                    Deleting this curriculum will remove it from all linked courses and batches.
                  </p>
                </div>
              ) : (
                <p>Are you sure you want to delete "{deletingCurriculum?.name}"? This action cannot be undone.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCurriculum && deleteCurriculumMutation.mutate(deletingCurriculum.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCurriculumMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default CurriculumManagement;
