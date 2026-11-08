import { requireClient, run } from './base';
import type { Result } from '../lib/errors';
import type { BookmarkRow, IdeaRow, SavedItemRow } from '../lib/database.types';

export const bookmarkService = {
  /** Public bookmark collection, ordered by category then title. */
  async list(category?: string): Promise<Result<BookmarkRow[]>> {
    return run(async () => {
      let builder = requireClient()
        .from('bookmarks')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true });
      if (category) builder = builder.eq('category', category);
      const { data, error } = await builder;
      if (error) throw error;
      return (data ?? []) as BookmarkRow[];
    });
  },

  async create(values: Partial<BookmarkRow>): Promise<Result<BookmarkRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('bookmarks')
        .insert(values)
        .select('*')
        .single();
      if (error) throw error;
      return data as BookmarkRow;
    });
  },

  async update(id: string, values: Partial<BookmarkRow>): Promise<Result<BookmarkRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('bookmarks')
        .update(values)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as BookmarkRow;
    });
  },

  async remove(id: string): Promise<Result<true>> {
    return run(async () => {
      const { error } = await requireClient().from('bookmarks').delete().eq('id', id);
      if (error) throw error;
      return true as const;
    });
  },
};

export const ideaService = {
  async list(status: 'draft' | 'published' | 'archived' = 'published'): Promise<Result<IdeaRow[]>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('ideas')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as IdeaRow[];
    });
  },

  async create(values: Partial<IdeaRow>): Promise<Result<IdeaRow>> {
    return run(async () => {
      const { data, error } = await requireClient().from('ideas').insert(values).select('*').single();
      if (error) throw error;
      return data as IdeaRow;
    });
  },

  async update(id: string, values: Partial<IdeaRow>): Promise<Result<IdeaRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('ideas')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as IdeaRow;
    });
  },

  async remove(id: string): Promise<Result<true>> {
    return run(async () => {
      const { error } = await requireClient().from('ideas').delete().eq('id', id);
      if (error) throw error;
      return true as const;
    });
  },
};

export const savedItemService = {
  /** A signed-in user's own saved items. RLS scopes rows to auth.uid(). */
  async listMine(userId: string, contentType?: string): Promise<Result<SavedItemRow[]>> {
    return run(async () => {
      let builder = requireClient()
        .from('saved_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (contentType) builder = builder.eq('content_type', contentType);
      const { data, error } = await builder;
      if (error) throw error;
      return (data ?? []) as SavedItemRow[];
    });
  },

  async save(userId: string, contentType: string, contentId: string): Promise<Result<SavedItemRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('saved_items')
        .upsert(
          { user_id: userId, content_type: contentType, content_id: contentId },
          { onConflict: 'user_id,content_type,content_id', ignoreDuplicates: false }
        )
        .select('*')
        .single();
      if (error) throw error;
      return data as SavedItemRow;
    });
  },

  async remove(id: string): Promise<Result<true>> {
    return run(async () => {
      const { error } = await requireClient().from('saved_items').delete().eq('id', id);
      if (error) throw error;
      return true as const;
    });
  },
};
