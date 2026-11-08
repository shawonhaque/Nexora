/**
 * Typed description of the NEXORA Supabase schema.
 *
 * This mirrors supabase/migrations/*.sql. Regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 * until then, keep it in sync with the migrations by hand.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ContentStatus = 'draft' | 'published' | 'archived';
export type AppRole = 'admin' | 'user';
export type Section =
  | 'news' | 'books' | 'study' | 'knowledge' | 'writing' | 'ideas' | 'learning';

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  section: string;
  created_at: string;
  updated_at: string;
};

export type PostRow = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  image_caption: string | null;
  image_credit: string | null;
  category_id: string | null;
  author_id: string | null;
  section: string;
  tags: string[] | null;
  status: ContentStatus;
  is_featured: boolean;
  is_breaking: boolean;
  is_editors_pick: boolean;
  source_name: string | null;
  source_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  correction_note: string | null;
  reading_time: number | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BookRow = {
  id: string;
  title: string;
  slug: string | null;
  subtitle: string | null;
  author: string | null;
  publisher: string | null;
  description: string | null;
  cover_image: string | null;
  pdf_url: string | null;
  external_url: string | null;
  file_visibility: 'public' | 'restricted' | 'external' | null;
  category_id: string | null;
  publication_year: number | null;
  language: string | null;
  isbn: string | null;
  page_count: number | null;
  edition: string | null;
  format: string | null;
  tags: string[] | null;
  review: string | null;
  rating: number | null;
  is_featured: boolean;
  is_editors_pick: boolean;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudyResourceRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  subject: string | null;
  subject_id: string | null;
  course_id: string | null;
  resource_type: string | null;
  level: string | null;
  language: string | null;
  file_url: string | null;
  cover_image: string | null;
  content: string | null;
  tags: string[] | null;
  is_featured: boolean;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  icon: string | null;
  level: string | null;
  status: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  cover_image: string | null;
  subject_id: string | null;
  instructor_name: string | null;
  difficulty_level: string | null;
  language: string | null;
  estimated_duration: number | null;
  status: ContentStatus;
  is_featured: boolean;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  lesson_type: string | null;
  content: string | null;
  video_url: string | null;
  file_url: string | null;
  duration_minutes: number | null;
  display_order: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
};

export type BookmarkRow = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  favicon_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type IdeaRow = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  tags: string[] | null;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
};

export type DiaryEntryRow = {
  id: string;
  title: string;
  content: string | null;
  mood: string | null;
  entry_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedItemRow = {
  id: string;
  user_id: string;
  content_type: string;
  content_id: string;
  created_at: string;
};

type TableDef<Row, Insert = Record<string, unknown>, Update = Record<string, unknown>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow>;
      categories: TableDef<CategoryRow>;
      posts: TableDef<PostRow>;
      books: TableDef<BookRow>;
      study_resources: TableDef<StudyResourceRow>;
      subjects: TableDef<SubjectRow>;
      courses: TableDef<CourseRow>;
      lessons: TableDef<LessonRow>;
      bookmarks: TableDef<BookmarkRow>;
      ideas: TableDef<IdeaRow>;
      diary_entries: TableDef<DiaryEntryRow>;
      saved_items: TableDef<SavedItemRow>;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { app_role: AppRole; content_status: ContentStatus };
    CompositeTypes: { [_ in never]: never };
  };
}
