import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';

export const PasswordSecuritySection: React.FC = () => {
  const { user } = useAuth();
  const [isChanging, setIsChanging] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const mutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: data.currentPassword });
      if (signInError) throw new Error('Current password is incorrect');
      const { error } = await supabase.auth.updateUser({ password: data.newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setIsChanging(false);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to change password'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (form.newPassword !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    mutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  const PasswordField: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void; placeholder: string }> = ({ id, label, value, onChange, show, toggle, placeholder }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id={id} type={show ? 'text' : 'password'} placeholder={placeholder} className="pl-10 pr-10 h-10" value={value} onChange={e => onChange(e.target.value)} required />
        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={toggle}>
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Lock className="h-4.5 w-4.5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Password & Security</h2>
        </div>
        <Button variant={isChanging ? 'ghost' : 'ghost'} size="sm" onClick={() => { setIsChanging(!isChanging); if (isChanging) setForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="text-primary hover:text-primary/80 h-8 px-3 text-xs">
          {isChanging ? 'Cancel' : 'Change Password'}
        </Button>
      </div>
      {!isChanging ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Password</p>
          <p className="text-sm text-foreground">••••••••</p>
          <p className="text-xs text-muted-foreground mt-2">We recommend using a strong, unique password.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
          <PasswordField id="current" label="Current Password" value={form.currentPassword} onChange={v => setForm({ ...form, currentPassword: v })} show={showCurrent} toggle={() => setShowCurrent(!showCurrent)} placeholder="Enter current password" />
          <PasswordField id="new" label="New Password" value={form.newPassword} onChange={v => setForm({ ...form, newPassword: v })} show={showNew} toggle={() => setShowNew(!showNew)} placeholder="Enter new password" />
          <PasswordField id="confirm" label="Confirm New Password" value={form.confirmPassword} onChange={v => setForm({ ...form, confirmPassword: v })} show={showConfirm} toggle={() => setShowConfirm(!showConfirm)} placeholder="Confirm new password" />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => { setIsChanging(false); setForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Updating...</> : 'Update Password'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
