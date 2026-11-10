import { postService, bookService, studyService, categoryService, diaryService, ideaService, bookmarkService } from '../../services';
import { estimateReadingTime, slugify, formatDateTime, formatDate } from '../../lib/format';
import type {
  BookRow,
  BookmarkRow,
  CategoryRow,
  DiaryEntryRow,
  IdeaRow,
  PostRow,
  StudyResourceRow,
} from '../../lib/database.types';
import type { ResourceConfig } from './types';
import { StatusChip } from './StatusChip';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const SECTION_OPTIONS = [
  { value: 'news', label: 'News' },
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'writing', label: 'Writing' },
  { value: 'learning', label: 'Learning' },
];

/** Converts an ISO timestamp to the value a datetime-local input expects. */
function localInput(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Shared field set for the four post-backed sections. */
const buildPostFields = (sectionLocked?: string) => [
  {
    name: 'title',
    label: 'Title',
    type: 'text' as const,
    required: true,
    full: true,
    placeholder: 'A clear, specific headline',
  },
  {
    name: 'slug',
    label: 'Slug',
    type: 'text' as const,
    help: 'Used in the URL. Left blank, it is generated from the title.',
    deriveFrom: { source: 'title', compute: slugify },
  },
  { name: 'subtitle', label: 'Subtitle', type: 'text' as const },
  {
    name: 'excerpt',
    label: 'Excerpt',
    type: 'textarea' as const,
    rows: 3,
    full: true,
    help: 'One or two sentences shown in listings and search results.',
  },
  { name: 'cover_image', label: 'Cover image URL', type: 'url' as const },
  {
    name: 'section',
    label: 'Section',
    type: 'select' as const,
    required: true,
    options: SECTION_OPTIONS,
    help: sectionLocked ? `Fixed to "${sectionLocked}" for this editor.` : undefined,
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select' as const,
    required: true,
    options: STATUS_OPTIONS,
  },
  { name: 'tags', label: 'Tags', type: 'tags' as const, full: true },
  {
    name: 'content',
    label: 'Content',
    type: 'textarea' as const,
    rows: 12,
    full: true,
    help: 'Markdown is rendered by the public article page.',
  },
  { name: 'source_name', label: 'Source name', type: 'text' as const },
  { name: 'source_url', label: 'Source URL', type: 'url' as const },
  { name: 'seo_title', label: 'SEO title', type: 'text' as const },
  { name: 'seo_description', label: 'SEO description', type: 'textarea' as const, rows: 2 },
  { name: 'is_featured', label: 'Featured', type: 'checkbox' as const, placeholder: 'Show in featured slots' },
  { name: 'is_editors_pick', label: "Editor's pick", type: 'checkbox' as const, placeholder: "Mark as an editor's pick" },
  {
    name: 'scheduled_at',
    label: 'Scheduled publish time',
    type: 'datetime' as const,
    help: 'A draft with a time in the past is published by the dashboard\'s "Publish due" action.',
  },
  { name: 'published_at', label: 'Published at', type: 'datetime' as const },
];

/**
 * Builds the config for one post-backed section. The four sections share the
 * same table and differ only by the `section` value they are scoped to.
 */
function postConfig(section: string, singular: string, description: string): ResourceConfig<PostRow> {
  return {
    key: `posts:${section}`,
    title: `${singular} entries`,
    description,
    singular,
    icon: 'book',
    hasStatus: true,
    searchKeys: ['title', 'slug'],
    columns: [
      {
        key: 'title',
        label: 'Title',
        render: (row) => <span className="font-medium text-heading">{row.title}</span>,
      },
      { key: 'status', label: 'Status', render: (row) => <StatusChip status={row.status} /> },
      {
        key: 'updated_at',
        label: 'Updated',
        render: (row) => <span className="font-mono text-xs text-muted">{formatDateTime(row.updated_at)}</span>,
      },
    ],
    fields: buildPostFields(section),
    load: async () => {
      const result = await postService.listAllForAdmin(section);
      return result;
    },
    create: (values) => postService.create({ ...values, section }),
    update: (id, values) => postService.update(id, { ...values, section }),
    remove: (id) => postService.remove(id),
    toForm: (row) => ({
      title: row.title,
      slug: row.slug,
      subtitle: row.subtitle,
      excerpt: row.excerpt,
      cover_image: row.cover_image,
      section: row.section,
      status: row.status,
      tags: row.tags ?? [],
      content: row.content,
      source_name: row.source_name,
      source_url: row.source_url,
      seo_title: row.seo_title,
      seo_description: row.seo_description,
      is_featured: row.is_featured,
      is_editors_pick: row.is_editors_pick,
      scheduled_at: localInput(row.scheduled_at),
      published_at: localInput(row.published_at),
    }),
    prepare: (values, existing) => {
      const content = typeof values.content === 'string' ? values.content : null;
      const title = typeof values.title === 'string' ? values.title : '';
      const status = values.status as PostRow['status'];
      const scheduled = isoOrNull(values.scheduled_at);
      const published = isoOrNull(values.published_at);

      return {
        ...(values as unknown as Partial<PostRow>),
        slug: (typeof values.slug === 'string' && values.slug) || slugify(title),
        scheduled_at: scheduled,
        // Publishing without an explicit date stamps it now; a scheduled draft
        // keeps its date until the publish-due action moves it.
        published_at: status === 'published' ? (published ?? new Date().toISOString()) : published,
        reading_time: existing?.reading_time ?? estimateReadingTime(content),
      };
    },
  };
}

export const newsConfig = postConfig(
  'news',
  'News entry',
  'Longer news pieces published from this dashboard, alongside the live feeds.'
);

export const knowledgeConfig = postConfig(
  'knowledge',
  'Knowledge entry',
  'Explanations that connect ideas across fields.'
);

export const writingConfig = postConfig(
  'writing',
  'Writing entry',
  'Essays, reflections and longer-form work.'
);

export const learningConfig = postConfig(
  'learning',
  'Learning entry',
  'Guides on learning effectively and studying with structure.'
);

export const booksConfig: ResourceConfig<BookRow> = {
  key: 'books',
  title: 'Books',
  description: 'Books in the library, with covers, ratings and reading links.',
  singular: 'Book',
  icon: 'book',
  hasStatus: true,
  searchKeys: ['title', 'author'],
  columns: [
    { key: 'title', label: 'Title', render: (row) => <span className="font-medium text-heading">{row.title}</span> },
    { key: 'author', label: 'Author', render: (row) => <span className="text-muted">{row.author ?? '—'}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusChip status={row.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, full: true },
    {
      name: 'slug',
      label: 'Slug',
      type: 'text',
      deriveFrom: { source: 'title', compute: slugify },
      help: 'Used in the URL when the book has its own page.',
    },
    { name: 'subtitle', label: 'Subtitle', type: 'text' },
    { name: 'author', label: 'Author', type: 'text' },
    { name: 'publisher', label: 'Publisher', type: 'text' },
    { name: 'publication_year', label: 'Publication year', type: 'number', min: 1, max: 2200 },
    { name: 'language', label: 'Language', type: 'text' },
    { name: 'isbn', label: 'ISBN', type: 'text' },
    { name: 'page_count', label: 'Page count', type: 'number', min: 1 },
    { name: 'edition', label: 'Edition', type: 'text' },
    { name: 'format', label: 'Format', type: 'text', placeholder: 'Hardcover, paperback, ebook…' },
    { name: 'rating', label: 'Rating (0–5)', type: 'number', min: 0, max: 5 },
    { name: 'cover_image', label: 'Cover image URL', type: 'url' },
    { name: 'external_url', label: 'External URL', type: 'url', help: 'Where the book can be read or bought.' },
    {
      name: 'file_visibility',
      label: 'File visibility',
      type: 'select',
      options: [
        { value: 'public', label: 'Public' },
        { value: 'restricted', label: 'Restricted' },
        { value: 'external', label: 'External' },
      ],
    },
    { name: 'status', label: 'Status', type: 'select', required: true, options: STATUS_OPTIONS },
    { name: 'tags', label: 'Tags', type: 'tags', full: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 4, full: true },
    { name: 'review', label: 'Review', type: 'textarea', rows: 5, full: true },
    { name: 'is_featured', label: 'Featured', type: 'checkbox', placeholder: 'Show in featured slots' },
    { name: 'is_editors_pick', label: "Editor's pick", type: 'checkbox', placeholder: "Mark as an editor's pick" },
    { name: 'published_at', label: 'Published at', type: 'datetime' },
  ],
  load: () => bookService.listAllForAdmin(),
  create: (values) => bookService.create(values),
  update: (id, values) => bookService.update(id, values),
  remove: (id) => bookService.remove(id),
  toForm: (row) => ({
    title: row.title,
    slug: row.slug,
    subtitle: row.subtitle,
    author: row.author,
    publisher: row.publisher,
    publication_year: row.publication_year,
    language: row.language,
    isbn: row.isbn,
    page_count: row.page_count,
    edition: row.edition,
    format: row.format,
    rating: row.rating,
    cover_image: row.cover_image,
    external_url: row.external_url,
    file_visibility: row.file_visibility,
    status: row.status,
    tags: row.tags ?? [],
    description: row.description,
    review: row.review,
    is_featured: row.is_featured,
    is_editors_pick: row.is_editors_pick,
    published_at: localInput(row.published_at),
  }),
  prepare: (values) => {
    const status = values.status as BookRow['status'];
    const published = isoOrNull(values.published_at);
    return {
      ...(values as unknown as Partial<BookRow>),
      slug: (typeof values.slug === 'string' && values.slug) || slugify(String(values.title ?? '')),
      published_at: status === 'published' ? (published ?? new Date().toISOString()) : published,
    };
  },
};

export const studyConfig: ResourceConfig<StudyResourceRow> = {
  key: 'study',
  title: 'Study resources',
  description: 'Notes, guides and worksheets published to the study section.',
  singular: 'Study resource',
  icon: 'flask',
  hasStatus: true,
  searchKeys: ['title', 'subject'],
  columns: [
    { key: 'title', label: 'Title', render: (row) => <span className="font-medium text-heading">{row.title}</span> },
    { key: 'subject', label: 'Subject', render: (row) => <span className="text-muted">{row.subject ?? '—'}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusChip status={row.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, full: true },
    {
      name: 'slug',
      label: 'Slug',
      type: 'text',
      deriveFrom: { source: 'title', compute: slugify },
    },
    { name: 'subject', label: 'Subject', type: 'text' },
    { name: 'resource_type', label: 'Resource type', type: 'text', placeholder: 'Notes, worksheet, guide…' },
    { name: 'level', label: 'Level', type: 'text', placeholder: 'Beginner, intermediate, advanced…' },
    { name: 'language', label: 'Language', type: 'text' },
    { name: 'file_url', label: 'File URL', type: 'url' },
    { name: 'cover_image', label: 'Cover image URL', type: 'url' },
    { name: 'status', label: 'Status', type: 'select', required: true, options: STATUS_OPTIONS },
    { name: 'tags', label: 'Tags', type: 'tags', full: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, full: true },
    { name: 'content', label: 'Content', type: 'textarea', rows: 10, full: true },
    { name: 'is_featured', label: 'Featured', type: 'checkbox', placeholder: 'Show in featured slots' },
    { name: 'published_at', label: 'Published at', type: 'datetime' },
  ],
  load: () => studyService.listAllForAdmin(),
  create: (values) => studyService.create(values),
  update: (id, values) => studyService.update(id, values),
  remove: (id) => studyService.remove(id),
  toForm: (row) => ({
    title: row.title,
    slug: row.slug,
    subject: row.subject,
    resource_type: row.resource_type,
    level: row.level,
    language: row.language,
    file_url: row.file_url,
    cover_image: row.cover_image,
    status: row.status,
    tags: row.tags ?? [],
    description: row.description,
    content: row.content,
    is_featured: row.is_featured,
    published_at: localInput(row.published_at),
  }),
  prepare: (values) => {
    const status = values.status as StudyResourceRow['status'];
    const published = isoOrNull(values.published_at);
    return {
      ...(values as unknown as Partial<StudyResourceRow>),
      slug: (typeof values.slug === 'string' && values.slug) || slugify(String(values.title ?? '')),
      published_at: status === 'published' ? (published ?? new Date().toISOString()) : published,
    };
  },
};

export const ideasConfig: ResourceConfig<IdeaRow> = {
  key: 'ideas',
  title: 'Ideas',
  description: 'Short notes and ideas, published or kept as drafts.',
  singular: 'Idea',
  icon: 'sparkle',
  hasStatus: true,
  searchKeys: ['title'],
  columns: [
    { key: 'title', label: 'Title', render: (row) => <span className="font-medium text-heading">{row.title}</span> },
    { key: 'status', label: 'Status', render: (row) => <StatusChip status={row.status} /> },
    {
      key: 'created_at',
      label: 'Created',
      render: (row) => <span className="font-mono text-xs text-muted">{formatDate(row.created_at)}</span>,
    },
  ],
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, full: true },
    { name: 'status', label: 'Status', type: 'select', required: true, options: STATUS_OPTIONS },
    { name: 'tags', label: 'Tags', type: 'tags' },
    { name: 'description', label: 'Summary', type: 'textarea', rows: 3, full: true },
    { name: 'content', label: 'Content', type: 'textarea', rows: 8, full: true },
  ],
  load: () => ideaService.listAllForAdmin(),
  create: (values) => ideaService.create(values),
  update: (id, values) => ideaService.update(id, values),
  remove: (id) => ideaService.remove(id),
  toForm: (row) => ({
    title: row.title,
    status: row.status,
    tags: row.tags ?? [],
    description: row.description,
    content: row.content,
  }),
};

export const bookmarksConfig: ResourceConfig<BookmarkRow> = {
  key: 'bookmarks',
  title: 'Bookmarks',
  description: 'Useful links worth keeping, grouped by category.',
  singular: 'Bookmark',
  icon: 'bookmark',
  searchKeys: ['title', 'url'],
  columns: [
    { key: 'title', label: 'Title', render: (row) => <span className="font-medium text-heading">{row.title}</span> },
    {
      key: 'url',
      label: 'URL',
      render: (row) => <span className="truncate font-mono text-xs text-muted">{row.url}</span>,
    },
  ],
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, full: true },
    { name: 'url', label: 'URL', type: 'url', required: true, full: true },
    { name: 'category', label: 'Category', type: 'text' },
    { name: 'favicon_url', label: 'Favicon URL', type: 'url' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, full: true },
  ],
  load: () => bookmarkService.list(),
  create: (values) => bookmarkService.create(values),
  update: (id, values) => bookmarkService.update(id, values),
  remove: (id) => bookmarkService.remove(id),
  toForm: (row) => ({
    title: row.title,
    url: row.url,
    category: row.category,
    favicon_url: row.favicon_url,
    description: row.description,
  }),
};

export const diaryConfig: ResourceConfig<DiaryEntryRow> = {
  key: 'diary',
  title: 'Private diary',
  description:
    'Personal entries. These are admin-only at the database level and never appear on public pages or in search.',
  singular: 'Diary entry',
  icon: 'shield',
  searchKeys: ['title'],
  columns: [
    { key: 'title', label: 'Title', render: (row) => <span className="font-medium text-heading">{row.title}</span> },
    {
      key: 'entry_date',
      label: 'Date',
      render: (row) => <span className="font-mono text-xs text-muted">{formatDate(row.entry_date)}</span>,
    },
  ],
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, full: true },
    { name: 'entry_date', label: 'Entry date', type: 'datetime' },
    { name: 'mood', label: 'Mood', type: 'text' },
    { name: 'content', label: 'Content', type: 'textarea', rows: 12, full: true },
  ],
  load: () => diaryService.list(),
  create: (values) => diaryService.create(values),
  update: (id, values) => diaryService.update(id, values),
  remove: (id) => diaryService.remove(id),
  toForm: (row) => ({
    title: row.title,
    entry_date: localInput(row.entry_date),
    mood: row.mood,
    content: row.content,
  }),
  prepare: (values) => ({ ...(values as unknown as Partial<DiaryEntryRow>), entry_date: isoOrNull(values.entry_date) }),
};

export const categoriesConfig: ResourceConfig<CategoryRow> = {
  key: 'categories',
  title: 'Categories',
  description: 'Categories group posts and books across the site.',
  singular: 'Category',
  icon: 'filter',
  searchKeys: ['name', 'slug'],
  columns: [
    { key: 'name', label: 'Name', render: (row) => <span className="font-medium text-heading">{row.name}</span> },
    { key: 'section', label: 'Section', render: (row) => <span className="chip">{row.section}</span> },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, full: true },
    { name: 'slug', label: 'Slug', type: 'text', required: true, deriveFrom: { source: 'name', compute: slugify } },
    { name: 'section', label: 'Section', type: 'select', required: true, options: SECTION_OPTIONS },
    { name: 'image_url', label: 'Image URL', type: 'url' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, full: true },
  ],
  load: () => categoryService.list(),
  create: (values) => categoryService.create(values),
  update: (id, values) => categoryService.update(id, values),
  remove: (id) => categoryService.remove(id),
  toForm: (row) => ({
    name: row.name,
    slug: row.slug,
    section: row.section,
    image_url: row.image_url,
    description: row.description,
  }),
};
