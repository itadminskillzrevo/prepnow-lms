import React, { useMemo, useState } from 'react';
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatIST } from '@/lib/dateUtils';
import { downloadInvoice, downloadReceipt } from '@/lib/invoicePdf';
import {
  Wallet, Banknote, AlertCircle, Users, CalendarDays,
  Search, Download, Plus, FileText, Receipt, Filter,
  Eye, Trash2, Pencil,
} from 'lucide-react';

type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque' | 'online' | 'other';

interface InvoiceRow {
  id: string;
  invoice_number: string;
  invoice_date: string;
  enrollment_date: string;
  total_fees: number;
  user_id: string;
  course_id: string;
  profile: { full_name: string | null; email: string; phone: string | null } | null;
  course: { title: string } | null;
  payments: Array<{
    id: string; amount: number; payment_method: string;
    reference_no: string | null; paid_on: string; notes: string | null;
  }>;
}

const PAGE_SIZE = 15;

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusBadge = (paid: number, total: number) => {
  if (paid <= 0) return <Badge variant="destructive">Due</Badge>;
  if (paid < total) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Partial</Badge>;
  return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Paid</Badge>;
};

const StatCard: React.FC<{
  title: string; value: string; icon: React.ReactNode; tint: string;
}> = ({ title, value, icon, tint }) => (
  <Card className="shadow-sm">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${tint}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className="text-lg font-bold truncate">{value}</div>
      </div>
    </CardContent>
  </Card>
);

const FinanceManagement: React.FC = () => {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const isSuperadmin = role === 'superadmin';

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'due'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  // Add payment dialog
  const [payTarget, setPayTarget] = useState<InvoiceRow | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRef, setPayRef] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payDate, setPayDate] = useState(formatIST(new Date(), "yyyy-MM-dd'T'HH:mm"));

  // Details + edit fees
  const [detailsTarget, setDetailsTarget] = useState<InvoiceRow | null>(null);
  const [editFeesTarget, setEditFeesTarget] = useState<InvoiceRow | null>(null);
  const [editFeesValue, setEditFeesValue] = useState('');

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['finance-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_finance_stats');
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  // Invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['finance-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_invoices')
        .select(`
          id, invoice_number, invoice_date, enrollment_date, total_fees, user_id, course_id,
          profile:profiles!finance_invoices_user_id_fkey(full_name, email, phone),
          course:courses(title),
          payments:finance_payments(id, amount, payment_method, reference_no, paid_on, notes)
        `)
        .order('created_at', { ascending: false });
      if (error) {
        // FK might not be named — fallback without alias hint
        const { data: d2, error: e2 } = await supabase
          .from('finance_invoices')
          .select(`
            id, invoice_number, invoice_date, enrollment_date, total_fees, user_id, course_id,
            course:courses(title),
            payments:finance_payments(id, amount, payment_method, reference_no, paid_on, notes)
          `)
          .order('created_at', { ascending: false });
        if (e2) throw e2;
        // attach profiles separately
        const ids = Array.from(new Set((d2 || []).map((r: any) => r.user_id)));
        const { data: profs } = await supabase
          .from('profiles').select('user_id, full_name, email, phone').in('user_id', ids);
        const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
        return (d2 || []).map((r: any) => ({ ...r, profile: map.get(r.user_id) || null })) as InvoiceRow[];
      }
      return (data || []) as unknown as InvoiceRow[];
    },
  });

  const courses = useMemo(() => {
    const m = new Map<string, string>();
    (invoices || []).forEach((i) => { if (i.course) m.set(i.course_id, i.course.title); });
    return Array.from(m.entries());
  }, [invoices]);

  const filtered = useMemo(() => {
    if (!invoices) return [];
    const s = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() + 86400000 : null;
    return invoices.filter((i) => {
      const paid = i.payments.reduce((a, p) => a + Number(p.amount || 0), 0);
      const status = paid <= 0 ? 'due' : paid < i.total_fees ? 'partial' : 'paid';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (courseFilter !== 'all' && i.course_id !== courseFilter) return false;
      if (from && new Date(i.invoice_date).getTime() < from) return false;
      if (to && new Date(i.invoice_date).getTime() > to) return false;
      if (s) {
        const hay = `${i.profile?.full_name || ''} ${i.profile?.email || ''} ${i.invoice_number} ${i.course?.title || ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [invoices, search, statusFilter, courseFilter, fromDate, toDate]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  React.useEffect(() => { if (page > pages) setPage(1); }, [filtered.length, pages, page]);

  // Add payment
  const addPayment = useMutation({
    mutationFn: async () => {
      if (!payTarget) throw new Error('No invoice selected');
      const amt = Number(payAmount);
      if (!amt || amt <= 0) throw new Error('Enter a valid amount');
      const paidSoFar = payTarget.payments.reduce((a, p) => a + Number(p.amount || 0), 0);
      if (paidSoFar + amt > payTarget.total_fees + 0.01) {
        throw new Error(`Amount exceeds due (${inr(payTarget.total_fees - paidSoFar)})`);
      }
      const { error } = await supabase.from('finance_payments').insert({
        invoice_id: payTarget.id,
        amount: amt,
        payment_method: payMethod,
        reference_no: payRef || null,
        paid_on: new Date(payDate).toISOString(),
        notes: payNote || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payment recorded');
      setPayTarget(null);
      setPayAmount(''); setPayRef(''); setPayNote(''); setPayMethod('cash');
      qc.invalidateQueries({ queryKey: ['finance-invoices'] });
      qc.invalidateQueries({ queryKey: ['finance-stats'] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add payment'),
  });

  // Delete payment (superadmin)
  const deletePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.from('finance_payments').delete().eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payment deleted');
      qc.invalidateQueries({ queryKey: ['finance-invoices'] });
      qc.invalidateQueries({ queryKey: ['finance-stats'] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete payment'),
  });

  // Update total fees (superadmin)
  const updateFees = useMutation({
    mutationFn: async () => {
      if (!editFeesTarget) throw new Error('No invoice selected');
      const amt = Number(editFeesValue);
      if (isNaN(amt) || amt < 0) throw new Error('Enter a valid amount');
      const { error } = await supabase
        .from('finance_invoices')
        .update({ total_fees: amt })
        .eq('id', editFeesTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invoice updated');
      setEditFeesTarget(null);
      setEditFeesValue('');
      qc.invalidateQueries({ queryKey: ['finance-invoices'] });
      qc.invalidateQueries({ queryKey: ['finance-stats'] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update'),
  });

  const buildPdfData = (i: InvoiceRow) => {
    const paid = i.payments.reduce((a, p) => a + Number(p.amount || 0), 0);
    return {
      invoiceNumber: i.invoice_number,
      invoiceDate: i.invoice_date,
      enrollmentDate: i.enrollment_date,
      studentName: i.profile?.full_name || '—',
      studentEmail: i.profile?.email || '',
      studentPhone: i.profile?.phone,
      courseTitle: i.course?.title || '—',
      totalFees: Number(i.total_fees),
      paidAmount: paid,
      dueAmount: Math.max(0, Number(i.total_fees) - paid),
      payments: i.payments
        .slice()
        .sort((a, b) => new Date(b.paid_on).getTime() - new Date(a.paid_on).getTime()),
    };
  };

  const exportCsv = () => {
    const headers = ['Invoice #','Invoice Date','Student','Email','Course','Enrolled On','Total Fees','Paid','Due','Status'];
    const rows = filtered.map((i) => {
      const paid = i.payments.reduce((a, p) => a + Number(p.amount || 0), 0);
      const due = Math.max(0, i.total_fees - paid);
      const status = paid <= 0 ? 'Due' : paid < i.total_fees ? 'Partial' : 'Paid';
      return [
        i.invoice_number,
        formatIST(i.invoice_date, 'yyyy-MM-dd'),
        i.profile?.full_name || '',
        i.profile?.email || '',
        i.course?.title || '',
        formatIST(i.enrollment_date, 'yyyy-MM-dd'),
        i.total_fees,
        paid,
        due,
        status,
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finance-export-${formatIST(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Finance Management
            </h1>
            <p className="text-sm text-muted-foreground">Track billing, collections and dues across all enrolled students.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCsv} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard title="Total Billing"     value={inr(Number(stats?.total_billing || 0))}    icon={<FileText className="h-5 w-5 text-blue-600" />}    tint="bg-blue-100 dark:bg-blue-950/40" />
          <StatCard title="Total Collection"  value={inr(Number(stats?.total_collection || 0))} icon={<Banknote className="h-5 w-5 text-emerald-600" />} tint="bg-emerald-100 dark:bg-emerald-950/40" />
          <StatCard title="Total Due"         value={inr(Number(stats?.total_due || 0))}        icon={<AlertCircle className="h-5 w-5 text-rose-600" />} tint="bg-rose-100 dark:bg-rose-950/40" />
          <StatCard title="Total Students"    value={String(stats?.total_students || 0)}        icon={<Users className="h-5 w-5 text-violet-600" />}    tint="bg-violet-100 dark:bg-violet-950/40" />
          <StatCard title="Today Collection"  value={inr(Number(stats?.today_collection || 0))} icon={<CalendarDays className="h-5 w-5 text-amber-600" />} tint="bg-amber-100 dark:bg-amber-950/40" />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, email, invoice #, course"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="due">Due</SelectItem>
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map(([id, title]) => (
                  <SelectItem key={id} value={id}>{title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invoices ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={12} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!isLoading && pageRows.length === 0 && (
                  <TableRow><TableCell colSpan={12} className="text-center py-10 text-muted-foreground">No invoices match the filters.</TableCell></TableRow>
                )}
                {pageRows.map((i) => {
                  const paid = i.payments.reduce((a, p) => a + Number(p.amount || 0), 0);
                  const due = Math.max(0, i.total_fees - paid);
                  const lastMethod = i.payments
                    .slice().sort((a, b) => new Date(b.paid_on).getTime() - new Date(a.paid_on).getTime())[0]?.payment_method;
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                      <TableCell>
                        <div className="font-medium">{i.profile?.full_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{i.profile?.email}</div>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{i.user_id.slice(0, 8)}</TableCell>
                      <TableCell className="max-w-[220px]"><div className="truncate">{i.course?.title || '—'}</div></TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{formatIST(i.enrollment_date, 'dd MMM yyyy')}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{formatIST(i.invoice_date, 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right font-medium">
                        <div className="inline-flex items-center gap-1">
                          {inr(i.total_fees)}
                          {isSuperadmin && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                              onClick={() => { setEditFeesTarget(i); setEditFeesValue(String(i.total_fees)); }}
                              title="Edit fees">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">{inr(paid)}</TableCell>
                      <TableCell className="text-right text-rose-600 font-medium">{inr(due)}</TableCell>
                      <TableCell>{statusBadge(paid, i.total_fees)}</TableCell>
                      <TableCell className="capitalize text-xs">{lastMethod || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 gap-1"
                            onClick={() => setDetailsTarget(i)} title="View details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {due > 0 && (
                            <Button size="sm" variant="outline" className="h-8 gap-1"
                              onClick={() => { setPayTarget(i); setPayAmount(String(due)); }}>
                              <Plus className="h-3.5 w-3.5" /> Pay
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-8 gap-1"
                            onClick={() => downloadInvoice(buildPdfData(i))}>
                            <FileText className="h-3.5 w-3.5" /> Invoice
                          </Button>
                          {i.payments.length > 0 && (
                            <Button size="sm" variant="ghost" className="h-8 gap-1"
                              onClick={() => {
                                const last = i.payments
                                  .slice().sort((a, b) => new Date(b.paid_on).getTime() - new Date(a.paid_on).getTime())[0];
                                downloadReceipt(buildPdfData(i), last);
                              }}>
                              <Receipt className="h-3.5 w-3.5" /> Receipt
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-xs text-muted-foreground">
                  Page {page} of {pages}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={!!payTarget} onOpenChange={(v) => !v && setPayTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {payTarget && (
                <>
                  <span className="font-mono">{payTarget.invoice_number}</span> · {payTarget.profile?.full_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {payTarget && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm bg-muted/40 rounded-lg p-3">
                <div><div className="text-xs text-muted-foreground">Total</div><div className="font-semibold">{inr(payTarget.total_fees)}</div></div>
                <div><div className="text-xs text-muted-foreground">Paid</div><div className="font-semibold text-emerald-600">{inr(payTarget.payments.reduce((a, p) => a + Number(p.amount || 0), 0))}</div></div>
                <div><div className="text-xs text-muted-foreground">Due</div><div className="font-semibold text-rose-600">{inr(Math.max(0, payTarget.total_fees - payTarget.payments.reduce((a, p) => a + Number(p.amount || 0), 0)))}</div></div>
              </div>

              <div>
                <Label>Amount (₹) *</Label>
                <Input type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div>
                <Label>Payment Method *</Label>
                <Select value={payMethod} onValueChange={(v: PaymentMethod) => setPayMethod(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference / Transaction No.</Label>
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label>Paid On</Label>
                <Input type="datetime-local" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea rows={2} value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button onClick={() => addPayment.mutate()} disabled={addPayment.isPending}>
              {addPayment.isPending ? 'Saving…' : 'Save Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Details Dialog */}
      <Dialog open={!!detailsTarget} onOpenChange={(v) => !v && setDetailsTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {detailsTarget && (
                <>
                  <span className="font-mono">{detailsTarget.invoice_number}</span> · {detailsTarget.profile?.full_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {detailsTarget && (() => {
            const paid = detailsTarget.payments.reduce((a, p) => a + Number(p.amount || 0), 0);
            const due = Math.max(0, detailsTarget.total_fees - paid);
            const sorted = detailsTarget.payments.slice().sort((a, b) => new Date(b.paid_on).getTime() - new Date(a.paid_on).getTime());
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm bg-muted/40 rounded-lg p-3">
                  <div><div className="text-xs text-muted-foreground">Student</div><div className="font-semibold truncate">{detailsTarget.profile?.full_name}</div></div>
                  <div><div className="text-xs text-muted-foreground">Course</div><div className="font-semibold truncate">{detailsTarget.course?.title}</div></div>
                  <div><div className="text-xs text-muted-foreground">Total</div><div className="font-semibold">{inr(detailsTarget.total_fees)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Due</div><div className="font-semibold text-rose-600">{inr(due)}</div></div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-2">Payment History ({sorted.length})</div>
                  {sorted.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">No payments yet.</div>
                  ) : (
                    <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                      {sorted.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-emerald-600">{inr(p.amount)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatIST(p.paid_on, 'dd MMM yyyy, hh:mm a')} · <span className="capitalize">{p.payment_method}</span>
                              {p.reference_no && <> · Ref: {p.reference_no}</>}
                            </div>
                            {p.notes && <div className="text-xs text-muted-foreground italic mt-1">{p.notes}</div>}
                          </div>
                          {isSuperadmin && (
                            <Button size="sm" variant="ghost" className="text-rose-600 h-8 w-8 p-0"
                              onClick={() => {
                                if (confirm('Delete this payment? This cannot be undone.')) deletePayment.mutate(p.id);
                              }} title="Delete payment">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button variant="outline" onClick={() => downloadInvoice(buildPdfData(detailsTarget))} className="gap-1">
                    <FileText className="h-4 w-4" /> Invoice PDF
                  </Button>
                  {sorted.length > 0 && (
                    <Button variant="outline" onClick={() => downloadReceipt(buildPdfData(detailsTarget), sorted[0])} className="gap-1">
                      <Receipt className="h-4 w-4" /> Latest Receipt
                    </Button>
                  )}
                  {due > 0 && (
                    <Button onClick={() => { setPayTarget(detailsTarget); setPayAmount(String(due)); setDetailsTarget(null); }} className="gap-1">
                      <Plus className="h-4 w-4" /> Add Payment
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Fees Dialog (SuperAdmin) */}
      <Dialog open={!!editFeesTarget} onOpenChange={(v) => !v && setEditFeesTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Total Fees</DialogTitle>
            <DialogDescription>
              {editFeesTarget && <span className="font-mono">{editFeesTarget.invoice_number}</span>}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Total Fees (₹)</Label>
            <Input type="number" min="0" step="0.01" value={editFeesValue}
              onChange={(e) => setEditFeesValue(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-2">
              Adjust the billed amount (e.g. apply scholarship or correct an error). Existing payments are unaffected.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFeesTarget(null)}>Cancel</Button>
            <Button onClick={() => updateFees.mutate()} disabled={updateFees.isPending}>
              {updateFees.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FinanceManagement;
