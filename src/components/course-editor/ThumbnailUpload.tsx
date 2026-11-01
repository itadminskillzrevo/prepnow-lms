import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Upload, Image, X } from 'lucide-react';

interface ThumbnailUploadProps {
  courseId: string;
  currentThumbnail: string | null;
}

export const ThumbnailUpload: React.FC<ThumbnailUploadProps> = ({
  courseId,
  currentThumbnail,
}) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentThumbnail);

  const updateThumbnailMutation = useMutation({
    mutationFn: async (thumbnailUrl: string | null) => {
      const { error } = await supabase
        .from('courses')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Thumbnail updated!');
      queryClient.invalidateQueries({ queryKey: ['course-edit', courseId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update thumbnail');
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `thumbnails/${courseId}.${fileExt}`;

      // Delete old thumbnail if exists
      if (currentThumbnail) {
        const oldPath = currentThumbnail.split('/course-media/')[1];
        if (oldPath) {
          await supabase.storage.from('course-media').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('course-media')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('course-media')
        .getPublicUrl(fileName);

      setPreview(urlData.publicUrl);
      await updateThumbnailMutation.mutateAsync(urlData.publicUrl);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload thumbnail');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentThumbnail) return;

    try {
      const path = currentThumbnail.split('/course-media/')[1];
      if (path) {
        await supabase.storage.from('course-media').remove([path]);
      }
      setPreview(null);
      await updateThumbnailMutation.mutateAsync(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove thumbnail');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Course Thumbnail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt="Course thumbnail"
              className="w-full h-48 object-cover rounded-lg border"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
              <Input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
                id="thumbnail-replace"
              />
              <Label
                htmlFor="thumbnail-replace"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white text-foreground rounded-md hover:bg-white/90 transition-colors text-sm font-medium"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Replace
              </Label>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={updateThumbnailMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Image className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No thumbnail uploaded
            </p>
            <Input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
              id="thumbnail-upload"
            />
            <Label
              htmlFor="thumbnail-upload"
              className="cursor-pointer inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload Thumbnail
            </Label>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Recommended: 1280x720 (16:9 ratio). Max file size: 5MB.
        </p>
      </CardContent>
    </Card>
  );
};
