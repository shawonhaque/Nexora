import { requireClient, run, DEFAULT_PAGE_SIZE, escapeFilter, type Paginated } from './base';
import type { Result } from '../lib/errors';
import type { BookRow } from '../lib/database.types';

export interface BookQuery {
  status?: 'draft' | 'published' | 'archived';
  categoryId?: string;
  language?: string;
  featured?: boolean;
  editorsPick?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
  orderBy?: 'published_at' | 'created_at' | 'title' | 'rating' | 'publication_year';
  ascending?: boolean;
}

const LIST_COLUMNS =
  'id,title,slug,subtitle,author,publisher,description,cover_image,category_id,' +
  'publication_year,language,isbn,page_count,edition,format,tags,rating,is_featured,' +
  'is_editors_pick,status,published_at,created_at,updated_at';

export const bookService = {
  async list(query: BookQuery = {}): Promise<Result<Paginated<BookRow>>> {
    return run(async () => {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
      let builder = requireClient()
        .from('books')
        .select(LIST_COLUMNS, { count: 'exact' })
        .eq('status', query.status ?? 'published');

      if (query.categoryId) builder = builder.eq('category_id', query.categoryId);
      if (query.language) builder = builder.eq('language', query.language);
      if (query.featured) builder = builder.eq('is_featured', true);
      if (query.editorsPick) builder = builder.eq('is_editors_pick', true);
      if (query.search) {
        const term = `%${escapeFilter(query.search)}%`;
        builder = builder.or(`title.ilike.${term},author.ilike.${term},isbn.ilike.${term}`);
      }

      const column = query.orderBy ?? 'published_at';
      builder = builder.order(column, { ascending: query.ascending ?? false, nullsFirst: false });
      builder = builder.range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error, count } = await builder;
      if (error) throw error;
      const total = count ?? 0;
      return {
        items: (data ?? []) as unknown as BookRow[],
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      };
    });
  },

  async getBySlug(slug: string): Promise<Result<BookRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('books')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('That book could not be found.');
      return data as BookRow;
    });
  },

  async listForAdmin(query: BookQuery = {}): Promise<Result<Paginated<BookRow>>> {
    return run(async () => {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = query.pageSize ?? 20;
      let builder = requireClient().from('books').select('*', { count: 'exact' });
      if (query.status) builder = builder.eq('status', query.status);
      if (query.search) builder = builder.ilike('title', `%${escapeFilter(query.search)}%`);
      builder = builder.order('updated_at', { ascending: false, nullsFirst: false });
      builder = builder.range((page - 1) * pageSize, page * pageSize - 1);
      const { data, error, count } = await builder;
      if (error) throw error;
      const total = count ?? 0;
      return { items: (data ?? []) as BookRow[], total, page, pageSize, hasMore: page * pageSize < total };
    });
  },

  /** Every book for the admin editor. Admins only, via RLS. */
  async listAllForAdmin(): Promise<Result<BookRow[]>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('books')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as BookRow[];
    });
  },

  async create(values: Partial<BookRow>): Promise<Result<BookRow>> {
    return run(async () => {
      const { data, error } = await requireClient().from('books').insert(values).select('*').single();
      if (error) throw error;
      return data as BookRow;
    });
  },

  async update(id: string, values: Partial<BookRow>): Promise<Result<BookRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('books')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as BookRow;
    });
  },

  async remove(id: string): Promise<Result<true>> {
    return run(async () => {
      const { error } = await requireClient().from('books').delete().eq('id', id);
      if (error) throw error;
      return true as const;
    });
  },
};
