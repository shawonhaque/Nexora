import { requireClient, run } from './base';
import type { Result } from '../lib/errors';
import type { CategoryRow } from '../lib/database.types';

export const categoryService = {
  async list(section?: string): Promise<Result<CategoryRow[]>> {
    return run(async () => {
      let builder = requireClient().from('categories').select('*').order('name', { ascending: true });
      if (section) builder = builder.eq('section', section);
      const { data, error } = await builder;
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    });
  },

  async getBySlug(slug: string): Promise<Result<CategoryRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('That category could not be found.');
      return data as CategoryRow;
    });
  },

  async create(values: Partial<CategoryRow>): Promise<Result<CategoryRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('categories')
        .insert(values)
        .select('*')
        .single();
      if (error) throw error;
      return data as CategoryRow;
    });
  },

  async update(id: string, values: Partial<CategoryRow>): Promise<Result<CategoryRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('categories')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as CategoryRow;
    });
  },

  async remove(id: string): Promise<Result<true>> {
    return run(async () => {
      const { error } = await requireClient().from('categories').delete().eq('id', id);
      if (error) throw error;
      return true as const;
    });
  },
};
