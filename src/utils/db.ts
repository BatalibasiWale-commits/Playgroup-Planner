import { supabase } from '../lib/supabase';

export async function dbSave(userId: string, key: string, data: unknown): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('user_data')
    .upsert(
      { user_id: userId, key, data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' },
    );
}

export async function dbLoadAll(userId: string): Promise<Record<string, unknown>> {
  if (!supabase) return {};
  const { data } = await supabase
    .from('user_data')
    .select('key, data')
    .eq('user_id', userId);
  if (!data) return {};
  return Object.fromEntries(data.map((row: { key: string; data: unknown }) => [row.key, row.data]));
}
