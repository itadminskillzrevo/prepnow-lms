import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, Search, UserPlus, Users, Crown, Loader2 } from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string;
  role: 'admin' | 'superadmin';
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

const AdminManagementTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'superadmin'>('admin');
  const queryClient = useQueryClient();

  const { data: admins, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from('user_roles').select('*').in('role', ['admin', 'superadmin']);
      if (error) throw error;

      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email, avatar_url').in('user_id', userIds);

      return roles.map(role => ({
        ...role,
        profile: profiles?.find(p => p.user_id === role.user_id)
      })) as AdminUser[];
    }
  });

  const { data: allUsers } = useQuery({
    queryKey: ['all-users-for-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, email');
      if (error) throw error;
      return data;
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'superadmin' | 'instructor' | 'student' }) => {
      const { error } = await supabase.rpc('change_user_role', {
        p_target_user_id: userId,
        p_new_role: newRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated successfully');
    },
    onError: () => {
      toast.error('Failed to update role');
    }
  });

  const addAdminMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'superadmin' }) => {
      const { error } = await supabase.rpc('change_user_role', {
        p_target_user_id: userId,
        p_new_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Admin added successfully');
      setIsDialogOpen(false);
      setSelectedUserId('');
    },
    onError: () => {
      toast.error('Failed to add admin');
    }
  });

  const filteredAdmins = admins?.filter(admin => 
    admin.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableUsers = allUsers?.filter(user => !admins?.some(admin => admin.user_id === user.user_id));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Admins</p>
                <p className="text-2xl font-bold">{admins?.filter(a => a.role === 'admin').length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10"><Crown className="h-6 w-6 text-accent" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Super Admins</p>
                <p className="text-2xl font-bold">{admins?.filter(a => a.role === 'superadmin').length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10"><Shield className="h-6 w-6 text-green-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Privileged</p>
                <p className="text-2xl font-bold">{admins?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Administrators</CardTitle>
              <CardDescription>View and manage admin accounts</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search admins..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-64" />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><UserPlus className="h-4 w-4" />Add Admin</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Admin</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Select User</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger><SelectValue placeholder="Choose a user" /></SelectTrigger>
                        <SelectContent>
                          {availableUsers?.map(user => (
                            <SelectItem key={user.user_id} value={user.user_id}>{user.full_name || user.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'admin' | 'superadmin')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => addAdminMutation.mutate({ userId: selectedUserId, role: selectedRole })} disabled={!selectedUserId || addAdminMutation.isPending}>
                      {addAdminMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add Admin
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins?.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {admin.profile?.avatar_url ? (
                            <img src={admin.profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-medium text-primary">{admin.profile?.full_name?.charAt(0) || 'A'}</span>
                          )}
                        </div>
                        <span className="font-medium">{admin.profile?.full_name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{admin.profile?.email}</TableCell>
                    <TableCell>
                      <Badge variant={admin.role === 'superadmin' ? 'default' : 'secondary'}>
                        {admin.role === 'superadmin' ? <><Crown className="h-3 w-3 mr-1" /> Super Admin</> : <><Shield className="h-3 w-3 mr-1" /> Admin</>}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Select value={admin.role} onValueChange={(value) => updateRoleMutation.mutate({ userId: admin.user_id, newRole: value as 'admin' | 'superadmin' | 'instructor' | 'student' })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                          <SelectItem value="instructor">Demote to Instructor</SelectItem>
                          <SelectItem value="student">Demote to Student</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAdmins?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No admins found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManagementTab;
