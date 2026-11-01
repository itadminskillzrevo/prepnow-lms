import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Megaphone, Plus, Search, Edit, Trash2, Eye, EyeOff, Calendar, Users, BookOpen, Layers, UserCircle, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import EmailNotificationForm from '@/components/notifications/EmailNotificationForm';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  target_type: 'all' | 'course' | 'batch' | 'role';
  target_id: string | null;
  target_role: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  starts_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const targetTypeLabels = {
  all: 'All Users',
  course: 'Specific Course',
  batch: 'Specific Batch',
  role: 'Specific Role',
};

const targetTypeIcons = {
  all: Users,
  course: BookOpen,
  batch: Layers,
  role: UserCircle,
};

const Announcements: React.FC = () => {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_type: 'all' as 'all' | 'course' | 'batch' | 'role',
    target_id: '',
    target_role: '' as '' | 'student' | 'instructor' | 'admin' | 'superadmin',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    starts_at: '',
    expires_at: '',
  });

  // Only admin/superadmin/instructor can access
  if (role !== 'admin' && role !== 'superadmin' && role !== 'instructor') {
    return <Navigate to="/dashboard" replace />;
  }

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Announcement[];
    },
  });

  // Fetch all users for email notifications
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-email'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name, email');
      return data || [];
    },
  });

  // Fetch courses for targeting
  const { data: courses = [] } = useQuery({
    queryKey: ['courses-for-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('is_published', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch batches for targeting
  const { data: batches = [] } = useQuery({
    queryKey: ['batches-for-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('id, name, course_id, courses(title)')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string; is_published?: boolean }) => {
      const payload: any = {
        title: data.title,
        content: data.content,
        target_type: data.target_type,
        target_id: data.target_type === 'course' || data.target_type === 'batch' ? data.target_id || null : null,
        target_role: data.target_type === 'role' && data.target_role ? data.target_role : null,
        priority: data.priority,
        starts_at: data.starts_at || null,
        expires_at: data.expires_at || null,
        is_published: data.is_published ?? false,
        created_by: user?.id,
      };

      if (data.id) {
        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success(editingAnnouncement ? 'Announcement updated' : 'Announcement created');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle publish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from('announcements')
        .update({ 
          is_published, 
          published_at: is_published ? new Date().toISOString() : null 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { is_published }) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success(is_published ? 'Announcement published' : 'Announcement unpublished');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      target_type: 'all',
      target_id: '',
      target_role: '',
      priority: 'normal',
      starts_at: '',
      expires_at: '',
    });
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target_type: announcement.target_type,
      target_id: announcement.target_id || '',
      target_role: (announcement.target_role as '' | 'student' | 'instructor' | 'admin' | 'superadmin') || '',
      priority: announcement.priority,
      starts_at: announcement.starts_at ? announcement.starts_at.slice(0, 16) : '',
      expires_at: announcement.expires_at ? announcement.expires_at.slice(0, 16) : '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingAnnouncement?.id,
      is_published: editingAnnouncement?.is_published,
    });
  };

  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTargetLabel = (announcement: Announcement) => {
    if (announcement.target_type === 'all') return 'All Users';
    if (announcement.target_type === 'role') return `Role: ${announcement.target_role}`;
    if (announcement.target_type === 'course') {
      const course = courses.find(c => c.id === announcement.target_id);
      return `Course: ${course?.title || 'Unknown'}`;
    }
    if (announcement.target_type === 'batch') {
      const batch = batches.find(b => b.id === announcement.target_id);
      return `Batch: ${batch?.name || 'Unknown'}`;
    }
    return 'Unknown';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Announcements & Email
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage announcements and send email notifications
          </p>
        </div>

        <Tabs defaultValue="announcements" className="space-y-6">
          <TabsList>
            <TabsTrigger value="announcements" className="gap-2">
              <Megaphone className="h-4 w-4" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email Notification
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcements" className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleCloseDialog()}>
                <Plus className="h-4 w-4" />
                Create Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
                <DialogDescription>
                  {editingAnnouncement ? 'Update the announcement details.' : 'Create a new announcement for your users.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Announcement title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Announcement content..."
                    rows={5}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select
                      value={formData.target_type}
                      onValueChange={(value: 'all' | 'course' | 'batch' | 'role') => 
                        setFormData({ ...formData, target_type: value, target_id: '', target_role: '' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="course">Specific Course</SelectItem>
                        <SelectItem value="batch">Specific Batch</SelectItem>
                        <SelectItem value="role">Specific Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => 
                        setFormData({ ...formData, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.target_type === 'course' && (
                  <div className="space-y-2">
                    <Label>Select Course</Label>
                    <Select
                      value={formData.target_id}
                      onValueChange={(value) => setFormData({ ...formData, target_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.target_type === 'batch' && (
                  <div className="space-y-2">
                    <Label>Select Batch</Label>
                    <Select
                      value={formData.target_id}
                      onValueChange={(value) => setFormData({ ...formData, target_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch: any) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.name} ({batch.courses?.title})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.target_type === 'role' && (
                  <div className="space-y-2">
                    <Label>Select Role</Label>
                    <Select
                      value={formData.target_role}
                      onValueChange={(value: '' | 'student' | 'instructor' | 'admin' | 'superadmin') => setFormData({ ...formData, target_role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Students</SelectItem>
                        <SelectItem value="instructor">Instructors</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                        <SelectItem value="superadmin">Super Admins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="starts_at">Start Date (Optional)</Label>
                    <Input
                      id="starts_at"
                      type="datetime-local"
                      value={formData.starts_at}
                      onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
                    <Input
                      id="expires_at"
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Announcements List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Megaphone className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg mb-2">No Announcements</CardTitle>
              <CardDescription className="text-center max-w-md">
                {searchQuery 
                  ? 'No announcements match your search criteria.'
                  : 'Create your first announcement to notify users about important updates.'}
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAnnouncements.map((announcement) => {
              const TargetIcon = targetTypeIcons[announcement.target_type];
              return (
                <Card key={announcement.id} className={!announcement.is_published ? 'opacity-75' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">{announcement.title}</CardTitle>
                          <Badge className={priorityColors[announcement.priority]}>
                            {announcement.priority}
                          </Badge>
                          {!announcement.is_published && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Draft
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <TargetIcon className="h-4 w-4" />
                            <span>{getTargetLabel(announcement)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(announcement.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePublishMutation.mutate({ 
                            id: announcement.id, 
                            is_published: !announcement.is_published 
                          })}
                          title={announcement.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {announcement.is_published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(announcement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {announcement.content}
                    </p>
                    {(announcement.starts_at || announcement.expires_at) && (
                      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                        {announcement.starts_at && (
                          <span>Starts: {format(new Date(announcement.starts_at), 'MMM d, yyyy HH:mm')}</span>
                        )}
                        {announcement.expires_at && (
                          <span>Expires: {format(new Date(announcement.expires_at), 'MMM d, yyyy HH:mm')}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this announcement? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
          </TabsContent>

          <TabsContent value="email">
            <EmailNotificationForm allUsers={allUsers} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Announcements;
