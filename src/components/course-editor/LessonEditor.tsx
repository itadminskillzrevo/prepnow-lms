import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VideoPreview } from '@/components/video/VideoPlayer';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  X,
  Video,
  FileText,
  Upload,
  Trash2,
  Paperclip,
} from 'lucide-react';

interface LessonEditorProps {
  lesson: any;
  courseId: string;
  open: boolean;
  onClose: () => void;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({
  lesson,
  courseId,
  open,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    video_url: '',
    duration_minutes: 0,
    is_free: false,
  });
  const [materials, setMaterials] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title || '',
        content: lesson.content || '',
        video_url: lesson.video_url || '',
        duration_minutes: lesson.duration_minutes || 0,
        is_free: lesson.is_free || false,
      });
      fetchMaterials();
    }
  }, [lesson]);

  const fetchMaterials = async () => {
    if (!lesson?.id) return;
    const { data } = await supabase
      .from('course_materials')
      .select('*')
      .eq('lesson_id', lesson.id);
    setMaterials(data || []);
  };

  const updateLessonMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('lessons')
        .update(data)
        .eq('id', lesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Lesson updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update lesson');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lesson?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${courseId}/${lesson.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('course-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('course-media')
        .getPublicUrl(fileName);

      const { error: materialError } = await supabase
        .from('course_materials')
        .insert({
          lesson_id: lesson.id,
          title: file.name,
          file_url: urlData.publicUrl,
          file_type: fileExt,
          file_size: file.size,
        });

      if (materialError) throw materialError;

      toast.success('File uploaded successfully!');
      fetchMaterials();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const deleteMaterialMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const { error } = await supabase
        .from('course_materials')
        .delete()
        .eq('id', materialId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Material deleted!');
      fetchMaterials();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Edit Lesson
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Lesson Title *</Label>
              <Input
                id="lesson-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="is-free">Free Preview</Label>
                <Switch
                  id="is-free"
                  checked={formData.is_free}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked })}
                />
              </div>
            </div>
          </div>

          {/* Video URL */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="video-url">Video URL (YouTube, Vimeo, or embed URL)</Label>
                <Input
                  id="video-url"
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Supports: YouTube, Vimeo, direct video files (.mp4, .webm), or any embed URL
                </p>
                {formData.video_url && <VideoPreview url={formData.video_url} />}
              </div>
            </CardContent>
          </Card>

          {/* Rich Text Content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Lesson Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Textarea
                  placeholder="Write your lesson content here... You can use Markdown formatting."
                  rows={10}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Supports Markdown formatting: **bold**, *italic*, # headers, - lists, etc.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* File Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.ipynb,.py,.zip,.rar,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.mp4,.mp3"
                />
                <Label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload File
                </Label>
                <span className="text-sm text-muted-foreground">
                  PDF, DOC, PPT, TXT, IPYNB, .py, ZIP, Excel, images, etc.
                </span>
              </div>

              {materials.length > 0 && (
                <div className="space-y-2">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{material.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {material.file_type?.toUpperCase()} •{' '}
                            {Math.round((material.file_size || 0) / 1024)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMaterialMutation.mutate(material.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={() => updateLessonMutation.mutate(formData)}
              disabled={updateLessonMutation.isPending}
            >
              {updateLessonMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Lesson
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
