import type {
  BookRow,
  CategoryRow,
  IdeaRow,
  PostRow,
  StudyResourceRow,
  BookmarkRow,
  SubjectRow,
} from '../lib/database.types';

/**
 * DEMO CONTENT — for design previews only.
 *
 * This is the single place where placeholder content lives. It is used purely
 * so the interface can be reviewed before a Supabase project is connected, and
 * every surface that renders it also shows a "Demo content" notice so it can
 * never be mistaken for real published material.
 *
 * Once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured, live data
 * replaces this automatically. Do not add real content here.
 */

const NOW = '2026-01-15T09:00:00.000Z';
const iso = (daysAgo: number, hour = 9) => {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const DEMO_CATEGORIES: CategoryRow[] = [
  { id: 'cat-news', name: 'News', slug: 'news', description: 'Timely reporting across the topics that matter.', image_url: null, section: 'news', created_at: NOW, updated_at: NOW },
  { id: 'cat-books', name: 'Books', slug: 'books', description: 'Reading lists, reviews and library notes.', image_url: null, section: 'books', created_at: NOW, updated_at: NOW },
  { id: 'cat-study', name: 'Study', slug: 'study', description: 'Notes, guides and exam preparation material.', image_url: null, section: 'study', created_at: NOW, updated_at: NOW },
  { id: 'cat-knowledge', name: 'Knowledge', slug: 'knowledge', description: 'Explanations that connect ideas across fields.', image_url: null, section: 'knowledge', created_at: NOW, updated_at: NOW },
  { id: 'cat-writing', name: 'My Writing', slug: 'writing', description: 'Essays, reflections and longer-form work.', image_url: null, section: 'writing', created_at: NOW, updated_at: NOW },
  { id: 'cat-ideas', name: 'Ideas', slug: 'ideas', description: 'Short notes and half-formed thoughts.', image_url: null, section: 'ideas', created_at: NOW, updated_at: NOW },
  { id: 'cat-learning', name: 'Learning', slug: 'learning', description: 'Guides on learning how to learn.', image_url: null, section: 'learning', created_at: NOW, updated_at: NOW },
];

type DemoPost = Omit<PostRow, 'author_id'> & { author_id: null };

function post(
  id: string,
  section: string,
  title: string,
  subtitle: string,
  excerpt: string,
  daysAgo: number,
  extra: Partial<DemoPost> = {}
): DemoPost {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
  return {
    id,
    title,
    slug,
    subtitle,
    excerpt,
    content: [
      '## Why this matters',
      '',
      'This is placeholder article body text used to preview the reading layout. It is not real reporting and carries no factual claims.',
      '',
      'The typography, spacing and measure you see here are the same ones applied to published articles, so long-form pages can be reviewed before any content is imported.',
      '',
      '### A short section',
      '',
      'Paragraphs, lists and quotes all share one editorial rhythm. Replace this text with real writing from the admin dashboard.',
      '',
      '> Placeholder quotation used only to demonstrate the blockquote style.',
      '',
      '- First list item',
      '- Second list item',
      '- Third list item',
    ].join('\n'),
    cover_image: null,
    image_caption: null,
    image_credit: null,
    category_id: `cat-${section}`,
    author_id: null,
    section,
    tags: ['placeholder', 'preview'],
    status: 'published',
    is_featured: false,
    is_breaking: false,
    is_editors_pick: false,
    source_name: null,
    source_url: null,
    seo_title: null,
    seo_description: null,
    canonical_url: null,
    correction_note: null,
    reading_time: 4,
    scheduled_at: null,
    published_at: iso(daysAgo),
    created_at: iso(daysAgo),
    updated_at: iso(daysAgo),
    ...extra,
  };
}

export const DEMO_POSTS: DemoPost[] = [
  post('p1', 'news', 'Sample News Headline: City Library Extends Weekend Hours', 'A placeholder story used to preview the news layout.', 'Placeholder summary for the lead story card. No factual claims are made in demo content.', 1, { is_featured: true, is_breaking: true }),
  post('p2', 'news', 'Sample News Headline: Regional Transit Plan Moves Forward', 'Second placeholder news item.', 'Placeholder summary text for the second news card.', 2, { is_breaking: true }),
  post('p3', 'news', 'Sample News Headline: Research Funding Announced', 'Third placeholder news item.', 'Placeholder summary text for a secondary news card.', 3, { is_editors_pick: true }),
  post('p4', 'knowledge', 'How a Search Index Actually Works', 'A walkthrough of the idea behind inverted indexes.', 'An explanation piece showing how the knowledge section reads.', 5, { is_featured: true }),
  post('p5', 'knowledge', 'Reading Slowly Is a Skill', 'Notes on comprehension over speed.', 'A short knowledge article preview.', 8),
  post('p6', 'writing', 'On Keeping a Commonplace Book', 'Why I write things down twice.', 'An essay preview for the writing section.', 4, { is_editors_pick: true }),
  post('p7', 'writing', 'The Case for Boring Tools', 'Durable software tends to be unexciting.', 'Another writing preview.', 11),
  post('p8', 'learning', 'A Study Routine That Survives a Busy Week', 'Practical structure over motivation.', 'A learning guide preview.', 6, { is_featured: true }),
  post('p9', 'learning', 'Spaced Repetition Without the Hype', 'What the evidence actually supports.', 'Learning article preview.', 9),
  post('p10', 'news', 'Sample News Headline: Local Archive Digitised', 'Fourth placeholder news item.', 'Placeholder summary text.', 7),
];

export const DEMO_BOOKS: BookRow[] = [
  {
    id: 'b1', title: 'Placeholder Title: Foundations', slug: 'foundations',
    subtitle: 'A demo entry', author: 'Demo Author', publisher: null,
    description: 'Placeholder book description used to preview the library card and detail layout.',
    cover_image: null, pdf_url: null, external_url: null, file_visibility: null,
    category_id: 'cat-books', publication_year: 2020, language: 'English', isbn: null,
    page_count: 320, edition: '1st', format: 'Hardcover', tags: ['demo'],
    review: null, rating: 4.5, is_featured: true, is_editors_pick: false,
    status: 'published', published_at: iso(20), created_at: iso(20), updated_at: iso(20),
  },
  {
    id: 'b2', title: 'Placeholder Title: Systems', slug: 'systems',
    subtitle: null, author: 'Demo Author', publisher: null,
    description: 'Second placeholder book used to preview a full grid of covers.',
    cover_image: null, pdf_url: null, external_url: null, file_visibility: null,
    category_id: 'cat-books', publication_year: 2021, language: 'English', isbn: null,
    page_count: 280, edition: null, format: 'Paperback', tags: ['demo'],
    review: null, rating: 4.2, is_featured: false, is_editors_pick: true,
    status: 'published', published_at: iso(14), created_at: iso(14), updated_at: iso(14),
  },
  {
    id: 'b3', title: 'Placeholder Title: Practice', slug: 'practice',
    subtitle: null, author: 'Demo Author', publisher: null,
    description: 'Third placeholder book for layout preview.',
    cover_image: null, pdf_url: null, external_url: null, file_visibility: null,
    category_id: 'cat-books', publication_year: 2019, language: 'Bengali', isbn: null,
    page_count: 210, edition: null, format: 'E-book', tags: ['demo'],
    review: null, rating: 4.8, is_featured: false, is_editors_pick: false,
    status: 'published', published_at: iso(9), created_at: iso(9), updated_at: iso(9),
  },
  {
    id: 'b4', title: 'Placeholder Title: Reference', slug: 'reference',
    subtitle: null, author: 'Demo Author', publisher: null,
    description: 'Fourth placeholder book for layout preview.',
    cover_image: null, pdf_url: null, external_url: null, file_visibility: null,
    category_id: 'cat-books', publication_year: 2022, language: 'English', isbn: null,
    page_count: 400, edition: null, format: 'Hardcover', tags: ['demo'],
    review: null, rating: 4.0, is_featured: false, is_editors_pick: false,
    status: 'published', published_at: iso(5), created_at: iso(5), updated_at: iso(5),
  },
];

export const DEMO_STUDY: StudyResourceRow[] = [
  {
    id: 's1', title: 'Placeholder Notes: Algebra Basics', slug: 'algebra-basics',
    description: 'Demo study material used to preview the resource card.',
    subject: 'Mathematics', subject_id: null, course_id: null, resource_type: 'Notes',
    level: 'Beginner', language: 'English', file_url: null, cover_image: null,
    content: 'Placeholder study content.', tags: ['demo'], is_featured: true,
    status: 'published', published_at: iso(3), created_at: iso(3), updated_at: iso(3),
  },
  {
    id: 's2', title: 'Placeholder Guide: Writing Lab Reports', slug: 'writing-lab-reports',
    description: 'Second demo study resource.',
    subject: 'Science', subject_id: null, course_id: null, resource_type: 'Guide',
    level: 'Intermediate', language: 'English', file_url: null, cover_image: null,
    content: 'Placeholder study content.', tags: ['demo'], is_featured: false,
    status: 'published', published_at: iso(6), created_at: iso(6), updated_at: iso(6),
  },
  {
    id: 's3', title: 'Placeholder Worksheet: Grammar Drills', slug: 'grammar-drills',
    description: 'Third demo study resource.',
    subject: 'English', subject_id: null, course_id: null, resource_type: 'Worksheet',
    level: 'Beginner', language: 'English', file_url: null, cover_image: null,
    content: 'Placeholder study content.', tags: ['demo'], is_featured: false,
    status: 'published', published_at: iso(12), created_at: iso(12), updated_at: iso(12),
  },
];

export const DEMO_SUBJECTS: SubjectRow[] = [
  { id: 'sub-1', name: 'Mathematics', slug: 'mathematics', description: 'Numbers, structure and reasoning.', cover_image: null, icon: '∑', level: 'All levels', status: 'published', display_order: 1, created_at: NOW, updated_at: NOW },
  { id: 'sub-2', name: 'Physics', slug: 'physics', description: 'Matter, motion and energy.', cover_image: null, icon: '⚛', level: 'All levels', status: 'published', display_order: 2, created_at: NOW, updated_at: NOW },
  { id: 'sub-3', name: 'Computer Science', slug: 'computer-science', description: 'Computation and software systems.', cover_image: null, icon: '</>', level: 'All levels', status: 'published', display_order: 3, created_at: NOW, updated_at: NOW },
  { id: 'sub-4', name: 'English', slug: 'english', description: 'Language, literature and composition.', cover_image: null, icon: 'A', level: 'All levels', status: 'published', display_order: 4, created_at: NOW, updated_at: NOW },
  { id: 'sub-5', name: 'History', slug: 'history', description: 'People, places and change over time.', cover_image: null, icon: '⌛', level: 'All levels', status: 'published', display_order: 5, created_at: NOW, updated_at: NOW },
  { id: 'sub-6', name: 'Biology', slug: 'biology', description: 'Living systems at every scale.', cover_image: null, icon: '🧬', level: 'All levels', status: 'published', display_order: 6, created_at: NOW, updated_at: NOW },
];

export const DEMO_IDEAS: IdeaRow[] = [
  { id: 'i1', title: 'A reading log that tracks ideas, not page counts', description: 'Placeholder idea note.', content: null, tags: ['demo'], status: 'published', created_at: iso(2), updated_at: iso(2) },
  { id: 'i2', title: 'Weekly review template with three prompts', description: 'Placeholder idea note.', content: null, tags: ['demo'], status: 'published', created_at: iso(5), updated_at: iso(5) },
  { id: 'i3', title: 'Index cards as a lightweight database', description: 'Placeholder idea note.', content: null, tags: ['demo'], status: 'published', created_at: iso(10), updated_at: iso(10) },
];

export const DEMO_BOOKMARKS: BookmarkRow[] = [
  { id: 'bm1', title: 'Placeholder Resource One', url: 'https://example.com', description: 'Demo bookmark entry.', category: 'Reference', favicon_url: null, created_by: null, created_at: iso(1) },
  { id: 'bm2', title: 'Placeholder Resource Two', url: 'https://example.com', description: 'Demo bookmark entry.', category: 'Tools', favicon_url: null, created_by: null, created_at: iso(4) },
  { id: 'bm3', title: 'Placeholder Resource Three', url: 'https://example.com', description: 'Demo bookmark entry.', category: 'Reading', favicon_url: null, created_by: null, created_at: iso(8) },
];

export const DEMO_COUNTS = {
  posts: DEMO_POSTS.length,
  books: DEMO_BOOKS.length,
  study: DEMO_STUDY.length,
  ideas: DEMO_IDEAS.length,
};
