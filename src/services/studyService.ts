import { requireClient, run, DEFAULT_PAGE_SIZE, escapeFilter, type Paginated } from './base';
import type { Result } from '../lib/errors';
import type { StudyResourceRow } from '../lib/database.types';

export interface StudyQuery {
  status?: 'draft' | 'published' | 'archived';
  subjectId?: string;
  resourceType?: string;
  language?: string;
  level?: string;
  featured?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const studyService = {
  async list(query: StudyQuery = {}): Promise<Result<Paginated<StudyResourceRow>>> {
    return run(async () => {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
      let builder = requireClient()
        .from('study_resources')
        .select('*', { count: 'exact' })
        .eq('status', query.status ?? 'published');

      if (query.subjectId) builder = builder.eq('subject_id', query.subjectId);
      if (query.resourceType) builder = builder.eq('resource_type', query.resourceType);
      if (query.language) builder = builder.eq('language', query.language);
      if (query.level) builder = builder.eq('level', query.level);
      if (query.featured) builder = builder.eq('is_featured', true);
      if (query.search) builder = builder.ilike('title', `%${escapeFilter(query.search)}%`);

      builder = builder.order('published_at', { ascending: false, nullsFirst: false });
      builder = builder.range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error, count } = await builder;
      if (error) throw error;
      const total = count ?? 0;
      return {
        items: (data ?? []) as StudyResourceRow[],
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      };
    });
  },

  async getBySlug(slug: string): Promise<Result<StudyResourceRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('study_resources')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('That study resource could not be found.');
      return data as StudyResourceRow;
    });
  },

  async create(values: Partial<StudyResourceRow>): Promise<Result<StudyResourceRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('study_resources')
        .insert(values)
        .select('*')
        .single();
      if (error) throw error;
      return data as StudyResourceRow;
    });
  },

  async update(id: string, values: Partial<StudyResourceRow>): Promise<Result<StudyResourceRow>> {
    return run(async () => {
      const { data, error } = await requireClient()
        .from('study_resources')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as StudyResourceRow;
    });
  },

  async remove(id: string): Promise<Result<true>> {
    return run(async () => {
      const { error } = await requireClient().from('study_resources').delete().eq('id', id);
      if (error) throw error;
      return true as const;
    });
  },
};
