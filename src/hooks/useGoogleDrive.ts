import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  size?: string;
  parents?: string[];
}

interface DriveAction {
  action: 'list' | 'create-folder' | 'get-file' | 'upload' | 'delete';
  folderId?: string;
  query?: string;
  name?: string;
  parentId?: string;
  fileId?: string;
  content?: string;
  mimeType?: string;
}

async function callDriveFunction(params: DriveAction): Promise<DriveFile[] | DriveFile | { success: boolean }> {
  const { data, error } = await supabase.functions.invoke('google-drive', {
    body: params,
  });

  if (error) {
    console.error('Drive function error:', error);
    throw new Error(error.message || 'Failed to call Google Drive');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

export function useDriveFiles(folderId?: string, enabled = true) {
  return useQuery({
    queryKey: ['drive-files', folderId],
    queryFn: () => callDriveFunction({ action: 'list', folderId }) as Promise<DriveFile[]>,
    enabled,
    staleTime: 30000,
  });
}

export function useSearchDriveFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ query, folderId }: { query: string; folderId?: string }) =>
      callDriveFunction({ action: 'list', folderId, query }) as Promise<DriveFile[]>,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['drive-search', variables.query, variables.folderId], data);
    },
  });
}

export function useCreateDriveFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string }) =>
      callDriveFunction({ action: 'create-folder', name, parentId }) as Promise<DriveFile>,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drive-files', variables.parentId] });
      toast.success('Folder created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create folder: ${error.message}`);
    },
  });
}

export function useUploadToDrive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      content,
      mimeType,
      parentId,
    }: {
      name: string;
      content: string; // Base64 encoded
      mimeType: string;
      parentId?: string;
    }) => callDriveFunction({ action: 'upload', name, content, mimeType, parentId }) as Promise<DriveFile>,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drive-files', variables.parentId] });
      toast.success('File uploaded successfully');
    },
    onError: (error) => {
      toast.error(`Failed to upload file: ${error.message}`);
    },
  });
}

export function useDeleteDriveFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) =>
      callDriveFunction({ action: 'delete', fileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-files'] });
      toast.success('File deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete file: ${error.message}`);
    },
  });
}

export function useGetDriveFile() {
  return useMutation({
    mutationFn: (fileId: string) =>
      callDriveFunction({ action: 'get-file', fileId }) as Promise<DriveFile>,
  });
}

// Hook to manage drive attachments in database
export function useDriveAttachments(entityType: string, entityId?: string) {
  return useQuery({
    queryKey: ['drive-attachments', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];

      const { data, error } = await supabase
        .from('google_drive_attachments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });
}

export function useAddDriveAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      file,
    }: {
      entityType: string;
      entityId: string;
      file: DriveFile;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('google_drive_attachments')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          file_id: file.id,
          file_name: file.name,
          file_url: file.webViewLink || '',
          file_type: file.mimeType.split('/').pop() || null,
          mime_type: file.mimeType,
          thumbnail_url: file.thumbnailLink || null,
          file_size: file.size ? parseInt(file.size, 10) : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['drive-attachments', variables.entityType, variables.entityId] 
      });
      toast.success('File attached successfully');
    },
    onError: (error) => {
      toast.error(`Failed to attach file: ${error.message}`);
    },
  });
}

export function useRemoveDriveAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from('google_drive_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-attachments'] });
      toast.success('Attachment removed');
    },
    onError: (error) => {
      toast.error(`Failed to remove attachment: ${error.message}`);
    },
  });
}
