import type { ReactNode } from 'react';
import type { IconName } from '../news/ArticleCard';
import type { Result } from '../../lib/errors';

/** Input kinds the admin forms know how to render. */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'tags'
  | 'datetime'
  | 'url';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  /** Span both columns in the two-column form grid. */
  full?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  /**
   * Fills the field from another when the user leaves it blank, so a slug or a
   * reading time does not have to be typed by hand.
   */
  deriveFrom?: { source: string; compute: (value: string) => string | number };
}

export type FieldValue = string | number | boolean | string[] | null;
export type FormValues = Record<string, FieldValue>;

export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

/**
 * Everything the generic admin list/editor needs for one table. Services keep
 * their own signatures; each config adapts them here rather than the other way
 * round, so no service has to know about the admin UI.
 */
export interface ResourceConfig<T extends { id: string }> {
  key: string;
  title: string;
  description: string;
  singular: string;
  icon?: IconName;
  /** Show the draft/published/archived filter and status column. */
  hasStatus?: boolean;
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  /** Row fields searched by the free-text filter; compared case-insensitively. */
  searchKeys: string[];
  load: () => Promise<Result<T[]>>;
  create: (values: Partial<T>) => Promise<Result<T>>;
  update: (id: string, values: Partial<T>) => Promise<Result<T>>;
  remove: (id: string) => Promise<Result<true>>;
  /** Maps a row into form values for editing. */
  toForm: (row: T) => FormValues;
  /** Adjusts form values before writing; used for timestamps and derived fields. */
  prepare?: (values: FormValues, existing: T | null) => Partial<T>;
  /** Extra per-row controls, for example a publish action. */
  rowActions?: (row: T, reload: () => void) => ReactNode;
}
