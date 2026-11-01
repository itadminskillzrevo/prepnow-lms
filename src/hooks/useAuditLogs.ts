import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export const useAuditLogs = (filters?: {
  userId?: string;
  entityType?: string;
  action?: string;
  days?: number;
}) => {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.days) {
        const startDate = format(subDays(new Date(), filters.days), 'yyyy-MM-dd');
        query = query.gte('created_at', startDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
};

export const useLogAudit = () => {
  return useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
    }: {
      action: string;
      entityType: string;
      entityId?: string;
      oldValues?: Record<string, string | number | boolean | null>;
      newValues?: Record<string, string | number | boolean | null>;
    }) => {
      const { data, error } = await supabase.rpc('log_audit_event', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId || null,
        p_old_values: oldValues as unknown as null,
        p_new_values: newValues as unknown as null,
      });

      if (error) throw error;
      return data;
    },
  });
};
