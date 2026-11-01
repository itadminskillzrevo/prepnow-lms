import { supabase } from '@/integrations/supabase/client';

export type OrangePgPlatform = 'main' | 'jr' | 'selfpaced';

export const isOrangePgUatEnabled =
  import.meta.env.VITE_ORANGE_PG_UAT_ENABLED === 'true';

export async function startOrangePgPayment(
  platform: OrangePgPlatform,
  recordId: string,
) {
  const { data, error } = await supabase.functions.invoke('orange-pg-initiate', {
    body: { platform, recordId },
  });

  if (error) {
    throw new Error(data?.error || error.message || 'Orange PG initiation failed');
  }
  if (!data?.redirectUrl) {
    throw new Error(data?.error || 'Orange PG did not return a redirect URL');
  }

  window.location.assign(data.redirectUrl);
}
