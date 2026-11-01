import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useDriveAttachments,
  useAddDriveAttachment,
  useRemoveDriveAttachment,
  DriveFile,
} from '@/hooks/useGoogleDrive';
import { GoogleDrivePicker } from './GoogleDrivePicker';
import {
  FolderOpen,
  Trash2,
  ExternalLink,
  FileText,
  Image,
  Video,
  File,
  Music,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriveAttachmentListProps {
  entityType: 'batch' | 'module' | 'lesson';
  entityId: string;
  title?: string;
  canEdit?: boolean;
  className?: string;
}

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('document') || mimeType.includes('text')) return FileText;
  return File;
};

const formatBytes = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DriveAttachmentList: React.FC<DriveAttachmentListProps> = ({
  entityType,
  entityId,
  title = 'Attachments',
  canEdit = false,
  className,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: attachments, isLoading } = useDriveAttachments(entityType, entityId);
  const addAttachment = useAddDriveAttachment();
  const removeAttachment = useRemoveDriveAttachment();

  const handleSelect = async (files: DriveFile[]) => {
    for (const file of files) {
      await addAttachment.mutateAsync({
        entityType,
        entityId,
        file,
      });
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await removeAttachment.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {title}
              {attachments && attachments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {attachments.length}
                </Badge>
              )}
            </CardTitle>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                disabled={addAttachment.isPending}
              >
                {addAttachment.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!attachments || attachments.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files attached</p>
              {canEdit && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  className="mt-2"
                >
                  Attach from Google Drive
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => {
                const Icon = getFileIcon(attachment.mime_type);
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                  >
                    {attachment.thumbnail_url ? (
                      <img
                        src={attachment.thumbnail_url}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {attachment.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {attachment.file_type && (
                          <span className="uppercase">{attachment.file_type}</span>
                        )}
                        {attachment.file_size && (
                          <>
                            <span>•</span>
                            <span>{formatBytes(attachment.file_size)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(attachment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <GoogleDrivePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        multiple
        title="Attach Files from Google Drive"
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the attachment link. The file will remain in Google Drive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
