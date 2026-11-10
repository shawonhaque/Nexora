import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../news/ArticleCard';
import { StateBlock } from '../ui/StateBlock';
import { FieldControl } from './FieldControl';
import type { FormValues, ResourceConfig, FieldValue } from './types';

type Status = 'all' | 'draft' | 'published' | 'archived';

/** Normalises empty strings to null so clearing a field clears the column. */
function normalise<T extends { id: string }>(values: FormValues, config: ResourceConfig<T>): FormValues {
  const next: FormValues = {};
  for (const field of config.fields) {
    const value = values[field.name];
    if (field.type === 'checkbox') {
      next[field.name] = Boolean(value);
      continue;
    }
    if (field.type === 'tags') {
      next[field.name] = Array.isArray(value) ? value : [];
      continue;
    }
    if (field.type === 'number') {
      next[field.name] = value === '' || value === null || value === undefined ? null : Number(value);
      continue;
    }
    next[field.name] = value === '' ? null : value;
  }
  return next;
}

function validate<T extends { id: string }>(
  values: FormValues,
  config: ResourceConfig<T>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of config.fields) {
    if (!field.required) continue;
    const value = values[field.name];
    const empty =
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);
    if (empty) errors[field.name] = `${field.label} is required.`;
  }
  return errors;
}

/**
 * Generic admin list plus create/edit panel for one table.
 *
 * It is deliberately one component rather than ten near-identical ones: the
 * sections differ only in their fields and services, which are supplied as a
 * config. Every write goes through the section's service, so the existing
 * service layer and RLS remain the only path to the database.
 */
export function ResourceManager<T extends { id: string }>({
  config,
}: {
  config: ResourceConfig<T>;
}) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('all');

  const [editing, setEditing] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await config.load();
    if (result.error) {
      setNotConfigured(Boolean(result.error.notConfigured));
      setLoadError(result.error.message);
      setRows([]);
    } else {
      setRows(result.data ?? []);
    }
    setLoading(false);
  }, [config]);

  useEffect(() => {
    void load();
  }, [load]);

  // Close the editor on Escape, and move focus into it when it opens.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeEditor();
    }
    document.addEventListener('keydown', onKeyDown);
    const focusTarget = firstFieldRef.current?.querySelector<HTMLElement>('input, textarea, select');
    focusTarget?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openCreate() {
    setEditing(null);
    setValues(
      Object.fromEntries(
        config.fields.map((field) => [
          field.name,
          field.type === 'checkbox' ? false : field.type === 'tags' ? [] : null,
        ])
      )
    );
    setErrors({});
    setSaveError(null);
    setOpen(true);
  }

  function openEdit(row: T) {
    setEditing(row);
    setValues(config.toForm(row));
    setErrors({});
    setSaveError(null);
    setOpen(true);
  }

  function closeEditor() {
    setOpen(false);
    setEditing(null);
    setSaveError(null);
  }

  function setField(name: string, value: FieldValue) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  /** Fills a blank derived field when the user leaves its source field. */
  function applyDerived(fieldName: string) {
    const field = config.fields.find((item) => item.name === fieldName);
    if (!field?.deriveFrom) return;
    const sourceValue = values[field.deriveFrom.source];
    const current = values[field.name];
    if (current === null || current === undefined || current === '') {
      if (typeof sourceValue === 'string' && sourceValue.trim()) {
        setField(field.name, field.deriveFrom.compute(sourceValue));
      }
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalised = normalise(values, config);
    const found = validate(normalised, config);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }

    setSaving(true);
    setSaveError(null);
    const payload = (config.prepare
      ? config.prepare(normalised, editing)
      : (normalised as unknown)) as Partial<T>;

    const result = editing
      ? await config.update(editing.id, payload)
      : await config.create(payload);

    setSaving(false);
    if (result.error) {
      setSaveError(result.error.message);
      return;
    }
    setNotice(editing ? `${config.singular} updated.` : `${config.singular} created.`);
    closeEditor();
    await load();
  }

  async function remove(id: string) {
    const result = await config.remove(id);
    setConfirmingId(null);
    if (result.error) {
      setLoadError(result.error.message);
      return;
    }
    setNotice(`${config.singular} deleted.`);
    await load();
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== 'all') {
        const rowStatus = (row as { status?: string }).status;
        if (rowStatus !== status) return false;
      }
      if (!term) return true;
      return config.searchKeys.some((key) => {
        const value = (row as Record<string, unknown>)[key];
        return typeof value === 'string' && value.toLowerCase().includes(term);
      });
    });
  }, [rows, search, status, config]);

  const counts = useMemo(() => {
    const base = { all: rows.length, draft: 0, published: 0, archived: 0 } as Record<Status, number>;
    for (const row of rows) {
      const rowStatus = (row as { status?: string }).status as Status | undefined;
      if (rowStatus && rowStatus in base) base[rowStatus] += 1;
    }
    return base;
  }, [rows]);

  if (notConfigured) {
    return (
      <StateBlock
        tone="warning"
        title="The backend is not connected"
        message="This editor writes to Supabase. No project is configured for this deployment, so nothing can be saved yet. Configure the project URL and anon key to enable it."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-heading">{config.title}</h2>
          <p className="mt-1 text-sm text-muted">{config.description}</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          <Icon name="plus" className="h-4 w-4" />
          New {config.singular.toLowerCase()}
        </button>
      </div>

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <Icon name="check" className="h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
          <div className="relative min-w-[180px] flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              className="field pl-9"
              placeholder={`Filter by ${config.searchKeys.join(', ')}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={`Filter ${config.title}`}
            />
          </div>
          {config.hasStatus && (
            <div className="flex items-center gap-1.5" role="group" aria-label="Filter by status">
              {(['all', 'draft', 'published', 'archived'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  aria-pressed={status === value}
                  className={`chip transition ${
                    status === value ? 'border-accent text-accent' : 'hover:text-heading'
                  }`}
                >
                  {value} {counts[value] > 0 && <span className="ml-1 opacity-70">{counts[value]}</span>}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="btn-quiet !py-1.5 text-xs" onClick={() => void load()}>
            <Icon name="refresh" className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {loadError && (
          <p role="alert" className="border-b border-line px-5 py-3 text-xs text-red-500">
            {loadError}
          </p>
        )}

        {loading ? (
          <div className="space-y-2 p-5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <div key={index} className="skeleton h-12 w-full" />
            ))}
            <p className="sr-only">Loading {config.title}…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-heading">
              {rows.length === 0 ? `No ${config.title.toLowerCase()} yet` : 'Nothing matches the filter'}
            </p>
            <p className="mt-1 text-sm text-muted">
              {rows.length === 0
                ? `Create the first ${config.singular.toLowerCase()} to see it listed here.`
                : 'Clear the search or choose a different status.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {config.columns.map((column) => (
                      <span key={column.key} className="text-sm">
                        {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {config.rowActions?.(row, () => void load())}
                  <button
                    type="button"
                    className="btn-quiet !py-1.5 text-xs"
                    onClick={() => openEdit(row)}
                    aria-label={`Edit ${config.singular.toLowerCase()}`}
                  >
                    Edit
                  </button>
                  {confirmingId === row.id ? (
                    <>
                      <button
                        type="button"
                        className="btn-ghost !py-1.5 text-xs text-red-500"
                        onClick={() => void remove(row.id)}
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        className="btn-quiet !py-1.5 text-xs"
                        onClick={() => setConfirmingId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-quiet !py-1.5 text-xs text-red-500"
                      onClick={() => setConfirmingId(row.id)}
                      aria-label={`Delete ${config.singular.toLowerCase()}`}
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
            className="card my-auto w-full max-w-3xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h2 id="editor-title" className="text-lg font-semibold text-heading">
                {editing ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
              </h2>
              <button
                type="button"
                className="btn-quiet !p-2"
                onClick={closeEditor}
                aria-label="Close editor"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit} noValidate>
              <div ref={firstFieldRef} className="grid gap-5 px-5 py-5 sm:grid-cols-2">
                {config.fields.map((field) => (
                  <FieldControl
                    key={field.name}
                    field={field}
                    value={values[field.name] ?? null}
                    error={errors[field.name]}
                    onChange={(value) => setField(field.name, value)}
                    onBlur={() => applyDerived(field.name)}
                  />
                ))}
              </div>

              {saveError && (
                <p role="alert" className="px-5 pb-2 text-sm text-red-500">
                  {saveError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
                <button type="button" className="btn-ghost" onClick={closeEditor}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : `Create ${config.singular.toLowerCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
