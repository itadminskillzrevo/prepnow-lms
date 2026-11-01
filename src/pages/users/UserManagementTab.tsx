import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Search, UserPlus, Shield, Users, GraduationCap, Download, Loader2, Eye, KeyRound, Pencil, Trash2, Mail, Phone, Calendar, User, Upload, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '@/types/lms';
import { formatIST } from '@/lib/dateUtils';
import BulkUserImportDialog from '@/components/users/BulkUserImportDialog';

const UserManagementTab: React.FC = () => {
  const { role: currentUserRole, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({ email: '', password: '', fullName: '', role: 'student' as AppRole });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // User profile dialogs
  const [viewUser, setViewUser] = useState<any>(null);
  const [editUser, setEditUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ full_name: '', phone: '', bio: '' });
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetMode, setResetMode] = useState<'set' | 'email'>('set');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*');
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      const { data } = await query.order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('*');
      return data || [];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase.rpc('change_user_role', {
        p_target_user_id: userId,
        p_new_role: newRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('User role updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update role');
    },
  });

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.password) {
      toast.error('Email and password are required');
      return;
    }
    if (newUserData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsCreatingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('You must be logged in'); return; }
      const response = await supabase.functions.invoke('create-user', {
        body: { email: newUserData.email, password: newUserData.password, fullName: newUserData.fullName, role: newUserData.role },
      });
      if (response.error) throw new Error(response.error.message || 'Failed to create user');
      if (response.data?.error) throw new Error(response.data.error);
      toast.success('User created successfully!');
      setIsAddUserOpen(false);
      setNewUserData({ email: '', password: '', fullName: '', role: 'student' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    setIsResettingPassword(true);
    try {
      if (resetMode === 'set') {
        if (!newPassword || newPassword.length < 6) {
          toast.error('Password must be at least 6 characters');
          setIsResettingPassword(false);
          return;
        }
        const response = await supabase.functions.invoke('change-user-password', {
          body: { userId: resetPasswordUser.user_id, newPassword },
        });
        if (response.error) throw new Error(response.error.message);
        if (response.data?.error) throw new Error(response.data.error);
        toast.success(`Password updated for ${resetPasswordUser.full_name || resetPasswordUser.email}`);
      } else {
        const response = await supabase.functions.invoke('reset-user-password', {
          body: { email: resetPasswordUser.email },
        });
        if (response.error) throw new Error(response.error.message);
        if (response.data?.error) throw new Error(response.data.error);
        toast.success(`Password reset email sent to ${resetPasswordUser.email}`);
      }
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    setIsEditingUser(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: editFormData.full_name,
        phone: editFormData.phone,
        bio: editFormData.bio,
      }).eq('user_id', editUser.user_id);
      if (error) throw error;
      toast.success('Profile updated successfully!');
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsEditingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setIsDeletingUser(true);
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: deleteUser.user_id },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast.success('User deleted successfully!');
      setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleExportCSV = () => {
    if (!users || users.length === 0) { toast.error('No users to export'); return; }
    const headers = ['Name', 'Email', 'Phone', 'Alt Phone', 'Gender', 'Date of Birth', 'Bio', 'Country', 'State', 'City', 'Highest Qualification', 'Area of Study', 'Year of Completion', 'GPA/Percentage', 'Years of Experience', 'Current Company', 'Current Designation', 'Role', 'Joined Date'];
    const rows = users.map((u: any) => [
      u.full_name || '', u.email || '', u.phone || '', u.alt_phone || '',
      u.gender || '', u.date_of_birth || '', u.bio || '',
      u.country || '', u.state || '', u.city || '',
      u.highest_qualification || '', u.area_of_study || '',
      u.year_of_completion?.toString() || '', u.gpa || '',
      u.years_of_experience?.toString() || '', u.current_company || '', u.current_designation || '',
      getUserRole(u.user_id),
      new Date(u.created_at).toLocaleDateString(),
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map((cell: string) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Users exported successfully');
  };

  const getUserRole = (userId: string) => {
    const role = userRoles?.find((r: any) => r.user_id === userId);
    return role?.role || 'student';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'superadmin': return 'destructive';
      case 'admin': return 'default';
      case 'instructor': return 'secondary';
      default: return 'outline';
    }
  };

  const openEditDialog = (u: any) => {
    setEditFormData({ full_name: u.full_name || '', phone: u.phone || '', bio: u.bio || '' });
    setEditUser(u);
  };

  const stats = [
    { title: 'Total Users', value: users?.length || 0, icon: Users, color: 'text-primary' },
    { title: 'Instructors', value: userRoles?.filter((r: any) => r.role === 'instructor').length || 0, icon: GraduationCap, color: 'text-success' },
    { title: 'Admins', value: userRoles?.filter((r: any) => r.role === 'admin' || r.role === 'superadmin').length || 0, icon: Shield, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>All Users</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
              <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Bulk Import</Button>
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button><UserPlus className="mr-2 h-4 w-4" />Add User</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New User</DialogTitle><DialogDescription>Create a new user account</DialogDescription></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={newUserData.fullName} onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })} placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={newUserData.email} onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })} placeholder="john@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} placeholder="Min 6 characters" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newUserData.role} onValueChange={(v) => setNewUserData({ ...newUserData, role: v as AppRole })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="instructor">Instructor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                      {isCreatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create User
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-primary">{u.full_name?.charAt(0) || 'U'}</span>
                          )}
                        </div>
                        <span className="font-medium">{u.full_name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant={getRoleBadgeVariant(getUserRole(u.user_id))}>{getUserRole(u.user_id)}</Badge></TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="View Profile" onClick={() => setViewUser(u)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Open Dashboard (new tab)" onClick={() => window.open(`/admin/user-dashboard/${u.user_id}`, '_blank')}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit Profile" onClick={() => openEditDialog(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Reset Password" onClick={() => setResetPasswordUser(u)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Select value={getUserRole(u.user_id)} onValueChange={(value) => updateRoleMutation.mutate({ userId: u.user_id, newRole: value as AppRole })}>
                          <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="instructor">Instructor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        {currentUserRole === 'superadmin' && u.user_id !== user?.id && (
                          <Button variant="ghost" size="icon" title="Delete User" className="text-destructive hover:text-destructive" onClick={() => setDeleteUser(u)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Profile Dialog */}
      <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>User Profile</DialogTitle></DialogHeader>
          {viewUser && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={viewUser.avatar_url || ''} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">{viewUser.full_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{viewUser.full_name || 'Unnamed User'}</h3>
                  <Badge variant={getRoleBadgeVariant(getUserRole(viewUser.user_id))} className="capitalize mt-1">
                    <Shield className="h-3 w-3 mr-1" />{getUserRole(viewUser.user_id)}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{viewUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{viewUser.phone || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="font-medium">{formatIST(viewUser.created_at, 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                </div>
                {viewUser.bio && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Bio</p>
                    <p className="text-sm">{viewUser.bio}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User Profile</DialogTitle><DialogDescription>Update profile details for {editUser?.full_name || editUser?.email}</DialogDescription></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editFormData.full_name} onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })} placeholder="Full Name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={editFormData.bio} onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })} placeholder="User bio..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEditUser} disabled={isEditingUser}>
              {isEditingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={() => { setResetPasswordUser(null); setNewPassword(''); setResetMode('set'); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Choose how to reset password for {resetPasswordUser?.full_name || resetPasswordUser?.email}</DialogDescription>
          </DialogHeader>
          {resetPasswordUser && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <KeyRound className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{resetPasswordUser.full_name || 'Unnamed User'}</p>
                  <p className="text-sm text-muted-foreground">{resetPasswordUser.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant={resetMode === 'set' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setResetMode('set')}>
                  Set New Password
                </Button>
                <Button variant={resetMode === 'email' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setResetMode('email')}>
                  Send Reset Email
                </Button>
              </div>
              {resetMode === 'set' ? (
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">A password reset link will be sent to their email address.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPasswordUser(null); setNewPassword(''); setResetMode('set'); }}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={isResettingPassword || (resetMode === 'set' && newPassword.length < 6)}>
              {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {resetMode === 'set' ? 'Update Password' : 'Send Reset Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>This action cannot be undone. The user and all their data will be permanently removed.</DialogDescription>
          </DialogHeader>
          {deleteUser && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <Trash2 className="h-4 w-4 text-destructive" />
                <div>
                  <p className="font-medium">{deleteUser.full_name || 'Unnamed User'}</p>
                  <p className="text-sm text-muted-foreground">{deleteUser.email}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeletingUser}>
              {isDeletingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkUserImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          queryClient.invalidateQueries({ queryKey: ['user-roles'] });
        }}
      />
    </div>
  );
};

export default UserManagementTab;
