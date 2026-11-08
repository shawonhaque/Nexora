import { requireClient, run, DEFAULT_PAGE_SIZE, escapeFilter, type Paginated } from './base';
import type { Result } from '../lib/errors';
import type { PostRow } from '../lib/database.types';

export interface PostQuery {
  section?: string;
  status?: 'draft' | 'published' | 'archived';
  categoryId?: string;
  featured?: boolean;
  breaking?: boolean;
  editorsPick?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
  orderBy?: 'published_at' | 'created_at' | 'updated_at' | 'title';
  ascending?: boolean;
}

const LIST_COLUMNS =
  'id,title,slug,subtitle,excerpt,cover_image,category_id,section,tags,status,' +
  'is_featured,is_breaking,is_editors_pick,reading_time,published_at,created_at,updated_at';

export const postService = {
  /** Public list. RLS already restricts anonymous reads to published rows. */
  async list(query: PostQuery = {}): Promise<Result<Paginated<PostRow>>> {
    return run(async () => {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
      let builder = requireClient()
        .from('posts')
        .select(LIST_COLUMNS, { count: 'exact' })
        .eq('status', query.status ?? 'published');

      if (query.section) builder = builder.eq('section', query.section);
      if (query.categoryId) builder = builder.eq('category_id', query.categoryId);
      if (query.featured) builder = builder.eq('is_featured', true);
      if (query.breaking) builder = builder.eq('is_breaking', true);
      if (query.editorsPick) builder = builder.eq('is_editors_pick', true);
      if (query.search) {
        const term = `%${escapeFilter(query.search)}%`;
        builder = builder.or(`title.ilike.${term},excerpt.ilike.${term}`);
      }

      const column = query.orderBy ?? 'published_at';
      builder = builder.order(column, { ascending: query.ascending ?? false, nullsFirst: false });
      builder = builder.range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error, count } = await builder;
      if (error) throw error;
      const total = count ?? 0;
      return {
        items: (data ?? []) as unknown as PostRow[],
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      };
    });
  },

  async getBySlug(slug: string): Promise<Result<PostRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('That article could not be found.');
      return data;
    });
  },

  /** Admin list: includes drafts and archived rows (RLS permits admins only). */
  async listForAdmin(query: PostQuery = {}): Promise<Result<Paginated<PostRow>>> {
    return run(async () => {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = query.pageSize ?? 20;
      let builder = requireClient().from('posts').select('*', { count: 'exact' });

      if (query.section) builder = builder.eq('section', query.section);
      if (query.status) builder = builder.eq('status', query.status);
      if (query.search) builder = builder.ilike('title', `%${escapeFilter(query.search)}%`);

      const column = query.orderBy ?? 'updated_at';
      builder = builder.order(column, { ascending: query.ascending ?? false, nullsFirst: false });
      builder = builder.range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error, count } = await builder;
      if (error) throw error;
      const total = count ?? 0;
      return { items: (data ?? []) as PostRow[], total, page, pageSize, hasMore: page * pageSize < total };
    });
  },

  async create(values: Partial<PostRow>): Promise<Result<PostRow>> {
    return run(async () => {
      const { data, error } = await requireClient().from('posts').insert(values).select('*').single();
      if (error) throw error;
      return data;
    });
  },

  async update(id: string, values: Partial<PostRow>): Promise<Result<PostRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('posts')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    });
  },

  async remove(id: string): Promise<Result<true>> {
    return run(async () => {
      const { error } = await requireClient().from('posts').delete().eq('id', id);
      if (error) throw error;
      return true as const;
    });
  },
};
