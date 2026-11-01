import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LessonNote {
  id: string;
  user_id: string;
  lesson_id: string;
  content: string;
  timestamp_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  lesson_id: string;
  timestamp_seconds: number;
  note: string | null;
  created_at: string;
}

export const useLessonNotes = (lessonId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['lesson-notes', lessonId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('lesson_notes')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LessonNote[];
    },
    enabled: !!lessonId && !!user,
  });
};

export const useBookmarks = (lessonId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bookmarks', lessonId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', user.id)
        .order('timestamp_seconds', { ascending: true });

      if (error) throw error;
      return data as Bookmark[];
    },
    enabled: !!lessonId && !!user,
  });
};

export const useCreateNote = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonId,
      content,
      timestampSeconds,
    }: {
      lessonId: string;
      content: string;
      timestampSeconds?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('lesson_notes')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          content,
          timestamp_seconds: timestampSeconds,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-notes', variables.lessonId] });
      toast.success('Note saved');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      content,
    }: {
      noteId: string;
      content: string;
      lessonId: string;
    }) => {
      const { data, error } = await supabase
        .from('lesson_notes')
        .update({ content })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-notes', variables.lessonId] });
      toast.success('Note updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, lessonId }: { noteId: string; lessonId: string }) => {
      const { error } = await supabase
        .from('lesson_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-notes', variables.lessonId] });
      toast.success('Note deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useCreateBookmark = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonId,
      timestampSeconds,
      note,
    }: {
      lessonId: string;
      timestampSeconds: number;
      note?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          timestamp_seconds: timestampSeconds,
          note,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', variables.lessonId] });
      toast.success('Bookmark added');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookmarkId, lessonId }: { bookmarkId: string; lessonId: string }) => {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', variables.lessonId] });
      toast.success('Bookmark removed');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
