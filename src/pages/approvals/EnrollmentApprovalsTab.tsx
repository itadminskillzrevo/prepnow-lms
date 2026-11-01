import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, Search, User, BookOpen, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { StatCard } from '@/components/analytics/StatCard';

const EnrollmentApprovalsTab: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null);

  const { data: pendingEnrollments, isLoading } = useQuery({
    queryKey: ['pending-enrollments'],
    queryFn: async () => {
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`*, course:courses(id, title, price, thumbnail_url), batch:batches(id, name)`)
        .eq('payment_status', 'completed')
        .eq('approval_status', 'pending')
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      
      if (enrollments && enrollments.length > 0) {
        const userIds = enrollments.map(e => e.user_id);
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds);
        return enrollments.map(enrollment => ({ ...enrollment, user_profile: profiles?.find(p => p.user_id === enrollment.user_id) || null }));
      }
      return enrollments || [];
    },
  });

  const { data: allEnrollments } = useQuery({
    queryKey: ['all-paid-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('enrollments').select('*').eq('payment_status', 'completed');
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ enrollmentId, approved }: { enrollmentId: string; approved: boolean }) => {
      const enrollment = pendingEnrollments?.find(e => e.id === enrollmentId);
      
      const { error } = await supabase
        .from('enrollments')
        .update({
          approval_status: approved ? 'approved' : 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes || null,
          status: approved ? 'active' : 'cancelled',
        })
        .eq('id', enrollmentId);
      
      if (error) throw error;

      if (approved && enrollment?.batch_id) {
        await supabase.from('batch_enrollments').update({ status: 'active' }).eq('batch_id', enrollment.batch_id).eq('user_id', enrollment.user_id);
      }

      if (enrollment?.user_id) {
        await supabase.from('notifications').insert({
          user_id: enrollment.user_id,
          title: approved ? 'Enrollment Approved!' : 'Enrollment Rejected',
          message: approved 
            ? `Your enrollment for "${enrollment.course?.title}" has been approved.`
            : `Your enrollment for "${enrollment.course?.title}" has been rejected. ${approvalNotes || ''}`,
          type: approved ? 'success' : 'warning',
          link: approved ? `/courses/${enrollment.course?.id}` : '/my-courses',
        });
      }
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['all-paid-enrollments'] });
      toast.success(approved ? 'Enrollment approved successfully!' : 'Enrollment rejected.');
      setSelectedEnrollment(null);
      setApprovalNotes('');
      setDialogAction(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to process enrollment');
    },
  });

  const handleApprove = (enrollment: any) => {
    setSelectedEnrollment(enrollment);
    setDialogAction('approve');
  };

  const handleReject = (enrollment: any) => {
    setSelectedEnrollment(enrollment);
    setDialogAction('reject');
  };

  const confirmAction = () => {
    if (!selectedEnrollment || !dialogAction) return;
    approveMutation.mutate({ enrollmentId: selectedEnrollment.id, approved: dialogAction === 'approve' });
  };

  const filteredEnrollments = pendingEnrollments?.filter((enrollment: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      enrollment.course?.title?.toLowerCase().includes(searchLower) ||
      enrollment.user_profile?.full_name?.toLowerCase().includes(searchLower) ||
      enrollment.user_profile?.email?.toLowerCase().includes(searchLower)
    );
  });

  const pendingCount = allEnrollments?.filter(e => e.approval_status === 'pending').length || 0;
  const approvedCount = allEnrollments?.filter(e => e.approval_status === 'approved').length || 0;
  const rejectedCount = allEnrollments?.filter(e => e.approval_status === 'rejected').length || 0;
  const totalRevenue = allEnrollments?.filter(e => e.approval_status === 'approved').reduce((sum, e) => sum + (Number(e.payment_amount) || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Pending Approvals" value={pendingCount} icon={Clock} />
        <StatCard title="Approved" value={approvedCount} icon={CheckCircle} />
        <StatCard title="Rejected" value={rejectedCount} icon={XCircle} />
        <StatCard title="Total Revenue" value={`₹${Math.round(totalRevenue).toLocaleString('en-IN')}`} icon={DollarSign} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Pending Enrollments</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search enrollments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredEnrollments && filteredEnrollments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment: any) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{enrollment.user_profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{enrollment.user_profile?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {enrollment.course?.thumbnail_url ? (
                            <img src={enrollment.course.thumbnail_url} alt="" className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center"><BookOpen className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                          <span className="font-medium">{enrollment.course?.title}</span>
                        </div>
                      </TableCell>
                      <TableCell><span className="font-semibold">${enrollment.payment_amount}</span></TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{enrollment.payment_method || 'N/A'}</Badge></TableCell>
                      <TableCell>
                        {enrollment.payment_date ? (
                          <div className="flex items-center gap-1 text-sm"><Calendar className="h-3 w-3" />{format(new Date(enrollment.payment_date), 'MMM d, yyyy')}</div>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" onClick={() => handleApprove(enrollment)}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(enrollment)}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pending Approvals</h3>
              <p className="text-muted-foreground">All paid enrollments have been processed.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!dialogAction} onOpenChange={() => { setDialogAction(null); setApprovalNotes(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogAction === 'approve' ? 'Approve Enrollment' : 'Reject Enrollment'}</DialogTitle>
            <DialogDescription>{dialogAction === 'approve' ? 'The student will get immediate access to the course.' : 'The student will be notified about the rejection.'}</DialogDescription>
          </DialogHeader>
          
          {selectedEnrollment && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p><strong>Student:</strong> {selectedEnrollment.user_profile?.full_name}</p>
                <p><strong>Course:</strong> {selectedEnrollment.course?.title}</p>
                <p><strong>Amount:</strong> ${selectedEnrollment.payment_amount}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes {dialogAction === 'reject' && '(required for rejection)'}</label>
                <Textarea placeholder={dialogAction === 'approve' ? 'Optional notes...' : 'Reason for rejection...'} value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>Cancel</Button>
            <Button variant={dialogAction === 'approve' ? 'default' : 'destructive'} onClick={confirmAction} disabled={approveMutation.isPending || (dialogAction === 'reject' && !approvalNotes)}>
              {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {dialogAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnrollmentApprovalsTab;
