import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Upload, Trash2, Image as ImageIcon } from 'lucide-react';

export const LogoUpload: React.FC = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const canManageLogo = role === 'admin' || role === 'superadmin';

  const { data: logoUrl, isLoading } = useQuery({
    queryKey: ['site-logo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'logo_url')
        .maybeSingle();
      return data?.setting_value || null;
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image (PNG, JPG, SVG, or WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      // Get current user first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error('Please log in again to upload the logo');
        setUploading(false);
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `logo/site-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('course-media')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('course-media')
        .getPublicUrl(fileName);

      // Upsert into site_settings
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          { setting_key: 'logo_url', setting_value: urlData.publicUrl, updated_by: user.id },
          { onConflict: 'setting_key' }
        );

      if (error) {
        console.error('Site settings upsert error:', error);
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['site-logo'] });
      toast.success('Logo uploaded successfully!');
    } catch (error: any) {
      console.error('Logo upload failed:', error);
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .delete()
        .eq('setting_key', 'logo_url');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['site-logo'] });
      toast.success('Logo removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove logo');
    }
  };

  if (!canManageLogo) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Site Logo
        </CardTitle>
        <CardDescription>
          Upload your organization's logo. Recommended size: 200x50px
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="h-16 w-40 rounded-lg border border-border bg-muted/50 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Site Logo" className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-xs text-muted-foreground">No logo uploaded</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="hidden"
              id="logo-upload"
            />
            <Label
              htmlFor="logo-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload Logo
            </Label>
            {logoUrl && (
              <Button variant="outline" size="sm" onClick={handleDeleteLogo} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Accepted formats: PNG, JPG, SVG, WebP. Max size: 2MB
        </p>
      </CardContent>
    </Card>
  );
};
