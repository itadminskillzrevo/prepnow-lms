import React, { useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, Shield } from 'lucide-react';
import type { Profile, AppRole } from '@/types/lms';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileHeaderProps {
  profile: Profile | null;
  role: AppRole | null;
  completionPercent: number;
  onAvatarChange?: () => void;
}

const getRoleLabel = (r: string) => {
  switch (r) {
    case 'superadmin': return { label: 'Super Admin', variant: 'destructive' as const };
    case 'admin': return { label: 'Admin', variant: 'default' as const };
    case 'instructor': return { label: 'Instructor', variant: 'secondary' as const };
    default: return { label: 'Student', variant: 'outline' as const };
  }
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, role, completionPercent, onAvatarChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return; }

    const ext = file.name.split('.').pop();
    const path = `${profile.user_id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('course-media').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Failed to upload avatar'); return; }

    const { data: urlData } = supabase.storage.from('course-media').getPublicUrl(path);
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', profile.user_id);
    if (updateError) { toast.error('Failed to update avatar'); return; }

    toast.success('Avatar updated!');
    onAvatarChange?.();
  };

  const roleInfo = role ? getRoleLabel(role) : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative group shrink-0">
        <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
          <AvatarImage src={profile?.avatar_url || ''} />
          <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
            {profile?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        <Button
          size="icon"
          variant="secondary"
          className="absolute -bottom-1 -right-1 rounded-full h-7 w-7 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2.5">
          <h1 className="text-xl font-bold text-foreground">{profile?.full_name || 'Unnamed User'}</h1>
          {roleInfo && (
            <Badge variant={roleInfo.variant} className="capitalize text-xs">
              <Shield className="h-3 w-3 mr-1" />
              {roleInfo.label}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{profile?.email}</p>
        <div className="mt-3 max-w-xs mx-auto sm:mx-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Profile Completion</span>
            <span className="text-xs font-semibold text-primary">{completionPercent}%</span>
          </div>
          <Progress value={completionPercent} className="h-1.5" />
        </div>
      </div>
    </div>
  );
};
