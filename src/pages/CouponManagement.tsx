import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatIST } from '@/lib/dateUtils';
import {
  Plus, Pencil, Trash2, Eye, TicketPercent, IndianRupee,
  Users, Calendar, TrendingUp, Copy, Search, Loader2
} from 'lucide-react';

interface CouponForm {
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  coupon_type: string;
  max_total_usage: number | null;
  per_user_limit: number;
  min_purchase_amount: number;
  max_discount_limit: number | null;
  start_date: string;
  expiry_date: string;
  applicable_to: string;
  course_id: string | null;
  is_active: boolean;
}

const defaultForm: CouponForm = {
  code: '', name: '', description: '',
  discount_type: 'percentage', discount_value: 0,
  coupon_type: 'per_user', max_total_usage: null, per_user_limit: 1,
  min_purchase_amount: 0, max_discount_limit: null,
  start_date: new Date().toISOString().slice(0, 16),
  expiry_date: '', applicable_to: 'all', course_id: null, is_active: true,
};

const couponTypeLabels: Record<string, string> = {
  one_time: 'One Time', per_user: 'Per User', unlimited: 'Unlimited',
  monthly: 'Monthly', campaign: 'Campaign',
};

const CouponManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(defaultForm);
  const [showUsage, setShowUsage] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses-for-coupons'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, title').order('title');
      return data || [];
    },
  });

  const { data: usageData = [] } = useQuery({
    queryKey: ['coupon-usage', showUsage],
    queryFn: async () => {
      if (!showUsage) return [];
      const { data, error } = await supabase
        .from('coupon_usage')
        .select('*, profiles:user_id(full_name, email)')
        .eq('coupon_id', showUsage)
        .order('used_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!showUsage,
  });

  const { data: usageStats = {} } = useQuery({
    queryKey: ['coupon-usage-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupon_usage')
        .select('coupon_id, discount_applied, final_price');
      if (error) throw error;
      const stats: Record<string, { count: number; totalDiscount: number; revenue: number }> = {};
      (data || []).forEach((u: any) => {
        if (!stats[u.coupon_id]) stats[u.coupon_id] = { count: 0, totalDiscount: 0, revenue: 0 };
        stats[u.coupon_id].count++;
        stats[u.coupon_id].totalDiscount += Number(u.discount_applied) || 0;
        stats[u.coupon_id].revenue += Number(u.final_price) || 0;
      });
      return stats;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.code || !form.name) throw new Error('Code and Name are required');
      if (form.discount_value <= 0) throw new Error('Discount value must be positive');

      const payload = {
        code: form.code.toUpperCase().trim(),
        name: form.name,
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        coupon_type: form.coupon_type,
        max_total_usage: form.max_total_usage || null,
        per_user_limit: form.per_user_limit,
        min_purchase_amount: form.min_purchase_amount,
        max_discount_limit: form.max_discount_limit || null,
        start_date: new Date(form.start_date).toISOString(),
        expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
        applicable_to: form.applicable_to,
        course_id: form.applicable_to === 'specific_course' ? form.course_id : null,
        is_active: form.is_active,
        created_by: user!.id,
      };

      if (editingId) {
        const { error } = await supabase.from('coupons').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('coupons').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success(editingId ? 'Coupon updated!' : 'Coupon created!');
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Coupon deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('coupons').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      code: c.code, name: c.name, description: c.description || '',
      discount_type: c.discount_type, discount_value: c.discount_value,
      coupon_type: c.coupon_type, max_total_usage: c.max_total_usage,
      per_user_limit: c.per_user_limit || 1, min_purchase_amount: c.min_purchase_amount || 0,
      max_discount_limit: c.max_discount_limit, 
      start_date: c.start_date ? new Date(c.start_date).toISOString().slice(0, 16) : '',
      expiry_date: c.expiry_date ? new Date(c.expiry_date).toISOString().slice(0, 16) : '',
      applicable_to: c.applicable_to, course_id: c.course_id, is_active: c.is_active,
    });
    setShowForm(true);
  };

  const filtered = coupons.filter((c: any) =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsage = Object.values(usageStats as Record<string, any>).reduce((s: number, v: any) => s + v.count, 0);
  const totalDiscount = Object.values(usageStats as Record<string, any>).reduce((s: number, v: any) => s + v.totalDiscount, 0);
  const totalRevenue = Object.values(usageStats as Record<string, any>).reduce((s: number, v: any) => s + v.revenue, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Coupon Management</h1>
            <p className="text-muted-foreground">Create and manage discount coupons for courses</p>
          </div>
          <Button onClick={() => { setForm(defaultForm); setEditingId(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Create Coupon
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><TicketPercent className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm text-muted-foreground">Total Coupons</p><p className="text-2xl font-bold">{coupons.length}</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><Users className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-sm text-muted-foreground">Total Usage</p><p className="text-2xl font-bold">{totalUsage}</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><IndianRupee className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-sm text-muted-foreground">Total Discount Given</p><p className="text-2xl font-bold">₹{Math.round(totalDiscount).toLocaleString('en-IN')}</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-sm text-muted-foreground">Revenue After Discount</p><p className="text-2xl font-bold">₹{Math.round(totalRevenue).toLocaleString('en-IN')}</p></div>
            </div>
          </CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search coupons..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Coupons Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center p-10 text-muted-foreground">No coupons found. Create your first coupon!</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c: any) => {
                    const stats = (usageStats as any)[c.id];
                    const isExpired = c.expiry_date && new Date(c.expiry_date) < new Date();
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono font-bold">{c.code}</code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Copied!'); }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          {c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{couponTypeLabels[c.coupon_type] || c.coupon_type}</Badge></TableCell>
                        <TableCell>{stats?.count || 0}{c.max_total_usage ? `/${c.max_total_usage}` : ''}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>{formatIST(c.start_date, 'dd MMM yyyy')}</div>
                            {c.expiry_date && <div className="text-muted-foreground">to {formatIST(c.expiry_date, 'dd MMM yyyy')}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isExpired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Switch checked={c.is_active} onCheckedChange={v => toggleActiveMutation.mutate({ id: c.id, active: v })} />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setShowUsage(c.id)}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('Delete this coupon?')) deleteMutation.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
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

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditingId(null); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coupon Code *</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME20" />
              </div>
              <div className="space-y-2">
                <Label>Coupon Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Welcome Offer" />
              </div>
              <div className="col-span-full space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Coupon description..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value *</Label>
                <Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} placeholder={form.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 5000'} />
              </div>
              <div className="space-y-2">
                <Label>Coupon Type</Label>
                <Select value={form.coupon_type} onValueChange={v => setForm({ ...form, coupon_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="per_user">Per User</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Total Usage</Label>
                <Input type="number" value={form.max_total_usage ?? ''} onChange={e => setForm({ ...form, max_total_usage: e.target.value ? Number(e.target.value) : null })} placeholder="Leave empty for unlimited" />
              </div>
              <div className="space-y-2">
                <Label>Per User Limit</Label>
                <Input type="number" value={form.per_user_limit} onChange={e => setForm({ ...form, per_user_limit: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Min Purchase Amount (₹)</Label>
                <Input type="number" value={form.min_purchase_amount} onChange={e => setForm({ ...form, min_purchase_amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Max Discount Limit (₹)</Label>
                <Input type="number" value={form.max_discount_limit ?? ''} onChange={e => setForm({ ...form, max_discount_limit: e.target.value ? Number(e.target.value) : null })} placeholder="Leave empty for no cap" />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="datetime-local" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="datetime-local" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Applicable To</Label>
                <Select value={form.applicable_to} onValueChange={v => setForm({ ...form, applicable_to: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    <SelectItem value="specific_course">Specific Course</SelectItem>
                    <SelectItem value="subscription">Subscription Plans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.applicable_to === 'specific_course' && (
                <div className="space-y-2">
                  <Label>Select Course</Label>
                  <Select value={form.course_id || ''} onValueChange={v => setForm({ ...form, course_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-3 col-span-full">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Usage Dialog */}
        <Dialog open={!!showUsage} onOpenChange={v => { if (!v) setShowUsage(null); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Coupon Usage Details</DialogTitle>
            </DialogHeader>
            {usageData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No usage recorded for this coupon yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Original Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Final Price</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageData.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{(u.profiles as any)?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{(u.profiles as any)?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>₹{Number(u.original_price).toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-green-600">-₹{Number(u.discount_applied).toLocaleString('en-IN')}</TableCell>
                      <TableCell className="font-medium">₹{Number(u.final_price).toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-sm">{formatIST(u.used_at, 'dd MMM yyyy HH:mm')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CouponManagement;
