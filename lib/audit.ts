import type { Database } from '@/lib/supabase/database.types';
import { createAdminClient } from '@/lib/supabase/admin';

type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert'];

export async function writeAuditLog(entry: AuditLogInsert) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('audit_log').insert(entry);

    if (error) {
      console.error('[audit] failed to write audit log:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('[audit] unexpected error while writing audit log:', error);
    return { error };
  }
}
