import { requireClient, run, escapeFilter } from './base';
import type { Result } from '../lib/errors';
import type { PostRow, BookRow, StudyResourceRow, IdeaRow } from '../lib/database.types';

export type SearchGroup = 'posts' | 'books' | 'study' | 'ideas';

export interface SearchHit {
  id: string;
  title: string;
  href: string;
  group: SearchGroup;
  section: string;
  excerpt: string | null;
}

export interface SearchResults {
  query: string;
  hits: SearchHit[];
  counts: Record<SearchGroup, number>;
}

export const SECTION_ROUTE: Record<string, string> = {
  news: 'news',
  knowledge: 'knowledge',
  writing: 'writing',
  learning: 'learning',
  ideas: 'ideas',
  books: 'books',
  study: 'study',
};

/**
 * Global search across the public content types.
 *
 * Only published rows are queried, and diary entries are deliberately absent —
 * they must never appear in public search. RLS is the second line of defence.
 */
export const searchService = {
  async search(rawQuery: string, limitPerGroup = 6): Promise<Result<SearchResults>> {
    return run(async () => {
      const query = rawQuery.trim();
      if (query.length < 2) {
        return { query, hits: [], counts: { posts: 0, books: 0, study: 0, ideas: 0 } };
      }

      const client = requireClient();
      const term = `%${escapeFilter(query)}%`;

      const [postsRes, booksRes, studyRes, ideasRes] = await Promise.all([
        client
          .from('posts')
          .select('id,title,slug,excerpt,section,subtitle')
          .eq('status', 'published')
          .or(`title.ilike.${term},excerpt.ilike.${term},subtitle.ilike.${term}`)
          .limit(limitPerGroup),
        client
          .from('books')
          .select('id,title,slug,description,author')
          .eq('status', 'published')
          .or(`title.ilike.${term},author.ilike.${term},description.ilike.${term}`)
          .limit(limitPerGroup),
        client
          .from('study_resources')
          .select('id,title,slug,description,subject')
          .eq('status', 'published')
          .or(`title.ilike.${term},description.ilike.${term}`)
          .limit(limitPerGroup),
        client
          .from('ideas')
          .select('id,title,description')
          .eq('status', 'published')
          .or(`title.ilike.${term},description.ilike.${term}`)
          .limit(limitPerGroup),
      ]);

      for (const res of [postsRes, booksRes, studyRes, ideasRes]) {
        if (res.error) throw res.error;
      }

      const posts = (postsRes.data ?? []) as Pick<PostRow, 'id' | 'title' | 'slug' | 'excerpt' | 'section' | 'subtitle'>[];
      const books = (booksRes.data ?? []) as Pick<BookRow, 'id' | 'title' | 'slug' | 'description' | 'author'>[];
      const study = (studyRes.data ?? []) as Pick<StudyResourceRow, 'id' | 'title' | 'slug' | 'description' | 'subject'>[];
      const ideas = (ideasRes.data ?? []) as Pick<IdeaRow, 'id' | 'title' | 'description'>[];

      const hits: SearchHit[] = [
        ...posts.map((row) => ({
          id: row.id,
          title: row.title,
          href: `/${SECTION_ROUTE[row.section] ?? 'knowledge'}/${row.slug}`,
          group: 'posts' as const,
          section: row.section,
          excerpt: row.excerpt ?? row.subtitle ?? null,
        })),
        ...books.map((row) => ({
          id: row.id,
          title: row.title,
          href: `/books/${row.slug ?? row.id}`,
          group: 'books' as const,
          section: 'books',
          excerpt: row.author ? `by ${row.author}` : row.description ?? null,
        })),
        ...study.map((row) => ({
          id: row.id,
          title: row.title,
          href: `/study/resources/${row.slug ?? row.id}`,
          group: 'study' as const,
          section: 'study',
          excerpt: row.subject ?? row.description ?? null,
        })),
        ...ideas.map((row) => ({
          id: row.id,
          title: row.title,
          href: '/ideas',
          group: 'ideas' as const,
          section: 'ideas',
          excerpt: row.description ?? null,
        })),
      ];

      return {
        query,
        hits,
        counts: {
          posts: posts.length,
          books: books.length,
          study: study.length,
          ideas: ideas.length,
        },
      };
    });
  },
};
