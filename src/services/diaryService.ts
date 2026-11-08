import { requireClient, run } from './base';
import type { Result } from '../lib/errors';
import type { DiaryEntryRow } from '../lib/database.types';

/**
 * Private diary service.
 *
 * Every call here is admin-only. That restriction is enforced by RLS on
 * `diary_entries` (see supabase/migrations), so an unauthorised caller gets an
 * empty result or a permission error even if the UI guard is bypassed.
 * Diary rows must never be exposed through public pages or global search.
 */
export const diaryService = {
  async list(): Promise<Result<DiaryEntryRow[]>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('diary_entries')
        .select('*')
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DiaryEntryRow[];
    });
  },

  async create(values: Partial<DiaryEntryRow>): Promise<Result<DiaryEntryRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('diary_entries')
        .insert(values)
        .select('*')
        .single();
      if (error) throw error;
      return data as DiaryEntryRow;
    });
  },

  async update(id: string, values: Partial<DiaryEntryRow>): Promise<Result<DiaryEntryRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('diary_entries')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as DiaryEntryRow;
    });
  },

  async remove(id: string): Promise<Result<true>> {
    return run(async () => {
      const { error } = await requireClient().from('diary_entries').delete().eq('id', id);
      if (error) throw error;
      return true as const;
    });
  },
};
