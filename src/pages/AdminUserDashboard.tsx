import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, User, BookOpen, ClipboardList, Award, Pencil, Trash2, Save, Mail, Phone, Calendar } from 'lucide-react';
import { formatIST } from '@/lib/dateUtils';

const AdminUserDashboard: React.FC = () => {
  const { userId } = useParams();
  const { role } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', bio: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!userId) return;
    setLoading(true);

    const [{ data: prof }, { data: roleData }, { data: enr }, { data: qr }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      supabase.from('enrollments').select('*, courses:course_id(title, thumbnail_url)').eq('user_id', userId).order('enrolled_at', { ascending: false }),
      supabase.from('exam_quiz_attempts').select('*, exam_quizzes:quiz_id(title)').eq('user_id', userId).order('completed_at', { ascending: false }).limit(50),
    ]);

    let resolvedProfile: any = prof;
    if (!resolvedProfile) {
      // Fallback for Junior students
      const { data: jrProf } = await supabase.from('jr_profiles').select('*').eq('user_id', userId).maybeSingle();
      resolvedProfile = jrProf;
    }

    setProfile(resolvedProfile);
    setUserRole(roleData?.role ?? null);
    setEnrollments(enr ?? []);
    setQuizResults(qr ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [userId]);

  const openEdit = () => {
    if (!profile) return;
    setEditForm({ full_name: profile.full_name || '', phone: profile.phone || '', bio: profile.bio || '' });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      phone: editForm.phone,
      bio: editForm.bio,
    }).eq('user_id', userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Profile updated');
    setEditOpen(false);
    load();
  };

  const removeEnrollment = async (enrollmentId: string) => {
    if (!confirm('Remove this enrollment?')) return;
    const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
    if (error) return toast.error(error.message);
    toast.success('Enrollment removed');
    load();
  };

  if (role !== 'admin' && role !== 'superadmin') {
    return <DashboardLayout><div className="text-center py-12 text-muted-foreground">Unauthorized</div></DashboardLayout>;
  }

  if (loading) {
    return <DashboardLayout><div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div></DashboardLayout>;
  }

  if (!profile) {
    return <DashboardLayout><div className="text-center py-12 text-muted-foreground">User not found</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </Link>

        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {(profile.full_name || profile.email || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold">{profile.full_name || 'No Name'}</h1>
                  <Badge>{userRole || 'student'}</Badge>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  {profile.email && <span className="inline-flex items-center gap-1"><Mail className="w-4 h-4" />{profile.email}</span>}
                  {profile.phone && <span className="inline-flex items-center gap-1"><Phone className="w-4 h-4" />{profile.phone}</span>}
                  <span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4" />Joined {formatIST(profile.created_at, 'dd MMM yyyy')}</span>
                </div>
                {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
              </div>
              <Button variant="outline" onClick={openEdit}><Pencil className="w-4 h-4 mr-2" /> Edit Profile</Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-3"><BookOpen className="w-8 h-8 text-primary" /><div><div className="text-sm text-muted-foreground">Enrolled Courses</div><div className="text-2xl font-bold">{enrollments.length}</div></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><ClipboardList className="w-8 h-8 text-primary" /><div><div className="text-sm text-muted-foreground">Quizzes Taken</div><div className="text-2xl font-bold">{quizResults.length}</div></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><Award className="w-8 h-8 text-primary" /><div><div className="text-sm text-muted-foreground">Avg Quiz Score</div><div className="text-2xl font-bold">{quizResults.length > 0 ? Math.round(quizResults.reduce((a, r) => a + ((r.score || 0) / Math.max(r.max_score || 1, 1)) * 100, 0) / quizResults.length) + '%' : '—'}</div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="courses">
          <TabsList>
            <TabsTrigger value="courses">Enrollments</TabsTrigger>
            <TabsTrigger value="quizzes">Quiz Results</TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            <Card>
              <CardHeader><CardTitle>Enrolled Courses</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.courses?.title || '—'}</TableCell>
                        <TableCell><Badge variant={e.approval_status === 'approved' ? 'default' : 'secondary'}>{e.approval_status || 'pending'}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{e.payment_status || 'none'}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(e.enrolled_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeEnrollment(e.id)}><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {enrollments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No enrollments</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quizzes">
            <Card>
              <CardHeader><CardTitle>Quiz Results</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quiz</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quizResults.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{(r as any).exam_quizzes?.title || '—'}</TableCell>
                        <TableCell>{r.score ?? '—'}/{r.max_score ?? '—'}</TableCell>
                        <TableCell>{r.passed ? 'Passed' : 'Failed'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '—'}</TableCell>
                      </TableRow>
                    ))}
                    {quizResults.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No quiz results</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Profile Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Student Profile</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Full Name</Label><Input value={editForm.full_name} onChange={(e) => setEditForm(p => ({ ...p, full_name: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Bio</Label><Input value={editForm.bio} onChange={(e) => setEditForm(p => ({ ...p, bio: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminUserDashboard;
