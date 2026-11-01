import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Search, UserPlus, Shield, Users, GraduationCap, Upload, KeyRound, FileText, CheckCircle, XCircle, Download, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AppRole } from '@/types/lms';

interface ImportResult {
  email: string;
  success: boolean;
  error?: string;
}

const AdminUsers: React.FC = () => {
  const { role: currentUserRole, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student' as AppRole,
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [resetPasswordEmail, setResetPasswordEmail] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Delete user state
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  
  // Change password state
  const [changePasswordUser, setChangePasswordUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
      await supabase.from('user_roles').delete().eq('user_id', userId);
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: newRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('User role updated successfully!');
      setSelectedUser(null);
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
      
      if (!session) {
        toast.error('You must be logged in to create users');
        return;
      }

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserData.email,
          password: newUserData.password,
          fullName: newUserData.fullName,
          role: newUserData.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create user');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

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

  const parseCSV = (text: string): { email: string; password: string; fullName?: string; role?: string }[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const emailIndex = headers.findIndex(h => h === 'email');
    const passwordIndex = headers.findIndex(h => h === 'password');
    const nameIndex = headers.findIndex(h => h === 'name' || h === 'fullname' || h === 'full_name');
    const roleIndex = headers.findIndex(h => h === 'role');

    if (emailIndex === -1 || passwordIndex === -1) {
      throw new Error('CSV must have "email" and "password" columns');
    }

    return lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',').map(v => v.trim());
      return {
        email: values[emailIndex] || '',
        password: values[passwordIndex] || '',
        fullName: nameIndex !== -1 ? values[nameIndex] : undefined,
        role: roleIndex !== -1 ? values[roleIndex] : undefined,
      };
    });
  };

  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const users = parseCSV(text);

      if (users.length === 0) {
        throw new Error('No valid users found in CSV');
      }

      const response = await supabase.functions.invoke('bulk-import-users', {
        body: { users },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to import users');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const { summary, results } = response.data;
      setImportResults(results);
      
      if (summary.failed === 0) {
        toast.success(`Successfully imported ${summary.success} users!`);
      } else {
        toast.warning(`Imported ${summary.success} users, ${summary.failed} failed`);
      }

      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to import users');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasswordReset = async (email: string) => {
    setIsResettingPassword(true);
    try {
      const response = await supabase.functions.invoke('reset-user-password', {
        body: { 
          email,
          redirectUrl: `${window.location.origin}/auth`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send reset email');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success(`Password reset email sent to ${email}`);
      setResetPasswordEmail(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Delete user handler
  const handleDeleteUser = async (userId: string) => {
    setIsDeletingUser(true);
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete user');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('User deleted successfully');
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await supabase.functions.invoke('change-user-password', {
        body: { userId, newPassword },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to change password');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('Password changed successfully');
      setChangePasswordUser(null);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Export users to CSV
  const handleExportCSV = () => {
    if (!users || users.length === 0) {
      toast.error('No users to export');
      return;
    }

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

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map((cell: string) => `"${(cell || '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
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
      case 'superadmin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'instructor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const stats = [
    {
      title: 'Total Users',
      value: users?.length || 0,
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Instructors',
      value: userRoles?.filter((r: any) => r.role === 'instructor').length || 0,
      icon: GraduationCap,
      color: 'text-success',
    },
    {
      title: 'Admins',
      value: userRoles?.filter((r: any) => r.role === 'admin' || r.role === 'superadmin').length || 0,
      icon: Shield,
      color: 'text-warning',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage users and their roles
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Export CSV */}
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            
            {/* Bulk Import */}
            <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Bulk Import Users</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to import multiple users at once.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      CSV Format Requirements
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your CSV must include these columns:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li><strong>email</strong> (required)</li>
                      <li><strong>password</strong> (required, min 6 characters)</li>
                      <li><strong>name</strong> or <strong>fullname</strong> (optional)</li>
                      <li><strong>role</strong> (optional: student, instructor, admin)</li>
                    </ul>
                    <div className="bg-background rounded p-2 text-xs font-mono mt-2">
                      email,password,name,role<br />
                      john@example.com,pass123,John Doe,student<br />
                      jane@example.com,pass456,Jane Smith,instructor
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="csv-file">Select CSV File</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      ref={fileInputRef}
                      onChange={handleBulkImport}
                      disabled={isImporting}
                    />
                  </div>

                  {isImporting && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Importing users...</p>
                    </div>
                  )}

                  {importResults && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      <p className="text-sm font-medium">Import Results:</p>
                      {importResults.map((result, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className={result.success ? '' : 'text-destructive'}>
                            {result.email} {result.error && `- ${result.error}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsBulkImportOpen(false);
                    setImportResults(null);
                  }}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Single User */}
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={newUserData.fullName}
                      onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUserData.role}
                      onValueChange={(value) => setNewUserData({ ...newUserData, role: value as AppRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="instructor">Instructor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        {currentUserRole === 'superadmin' && (
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                    {isCreatingUser ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-muted`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Users</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((userItem: any) => {
                    const role = getUserRole(userItem.user_id);
                    return (
                      <TableRow key={userItem.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-semibold text-primary">
                                {userItem.full_name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <span className="font-medium">
                              {userItem.full_name || 'Unnamed User'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {userItem.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(role) as any} className="capitalize">
                            {role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(userItem.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Change Password Button - for admin/superadmin */}
                            {['admin', 'superadmin'].includes(currentUserRole || '') && (
                              <Dialog open={changePasswordUser?.user_id === userItem.user_id} onOpenChange={(open) => {
                                if (!open) {
                                  setChangePasswordUser(null);
                                  setNewPassword('');
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setChangePasswordUser(userItem)}
                                    title="Change Password"
                                  >
                                    <Lock className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Change Password</DialogTitle>
                                    <DialogDescription>
                                      Set a new password for this user.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div>
                                      <p className="text-sm text-muted-foreground mb-1">User</p>
                                      <p className="font-medium">{userItem.full_name || userItem.email}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="new-password">New Password</Label>
                                      <Input
                                        id="new-password"
                                        type="password"
                                        placeholder="Minimum 6 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => {
                                      setChangePasswordUser(null);
                                      setNewPassword('');
                                    }}>
                                      Cancel
                                    </Button>
                                    <Button 
                                      onClick={() => handleChangePassword(userItem.user_id)}
                                      disabled={isChangingPassword}
                                    >
                                      {isChangingPassword ? 'Changing...' : 'Change Password'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}

                            {/* Password Reset Button */}
                            <Dialog open={resetPasswordEmail === userItem.email} onOpenChange={(open) => {
                              if (!open) setResetPasswordEmail(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setResetPasswordEmail(userItem.email)}
                                  title="Send Reset Email"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reset Password</DialogTitle>
                                  <DialogDescription>
                                    Send a password reset email to this user.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <p className="text-sm text-muted-foreground">
                                    A password reset link will be sent to:
                                  </p>
                                  <p className="font-medium mt-1">{userItem.email}</p>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setResetPasswordEmail(null)}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={() => handlePasswordReset(userItem.email)}
                                    disabled={isResettingPassword}
                                  >
                                    {isResettingPassword ? 'Sending...' : 'Send Reset Email'}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            {/* Change Role Button */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedUser(userItem)}
                                >
                                  Change Role
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Change User Role</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">User</p>
                                    <p className="font-medium">{userItem.full_name || userItem.email}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">New Role</p>
                                    <Select
                                      defaultValue={role}
                                      onValueChange={(value) =>
                                        updateRoleMutation.mutate({
                                          userId: userItem.user_id,
                                          newRole: value as AppRole,
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="student">Student</SelectItem>
                                        <SelectItem value="instructor">Instructor</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        {currentUserRole === 'superadmin' && (
                                          <SelectItem value="superadmin">Super Admin</SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* Delete User Button - Superadmin only */}
                            {currentUserRole === 'superadmin' && userItem.user_id !== user?.id && role !== 'superadmin' && (
                              <AlertDialog open={userToDelete?.user_id === userItem.user_id} onOpenChange={(open) => {
                                if (!open) setUserToDelete(null);
                              }}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setUserToDelete(userItem)}
                                    title="Delete User"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete <strong>{userItem.full_name || userItem.email}</strong>? 
                                      This action cannot be undone and will permanently remove this user and all their data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(userItem.user_id)}
                                      disabled={isDeletingUser}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {isDeletingUser ? 'Deleting...' : 'Delete User'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
