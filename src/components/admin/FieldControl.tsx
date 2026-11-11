import { useId } from 'react';
import type { FieldDef, FieldValue } from './types';

/** Converts an ISO timestamp to the value an `input[type=datetime-local]` expects. */
function toLocalInput(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Converts a `datetime-local` value back to an ISO string, or null when cleared. */
function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asText(value: FieldValue): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/**
 * One labelled admin form control. All field types share the same label,
 * help-text and error wiring so every editor behaves the same way.
 */
export function FieldControl({
  field,
  value,
  error,
  onChange,
  onBlur,
}: {
  field: FieldDef;
  value: FieldValue;
  error?: string;
  onChange: (value: FieldValue) => void;
  onBlur?: () => void;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : field.help ? `${id}-help` : undefined;

  const common = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    onBlur,
  };

  let control;
  switch (field.type) {
    case 'textarea':
      control = (
        <textarea
          {...common}
          className="field resize-y"
          rows={field.rows ?? 5}
          placeholder={field.placeholder}
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      );
      break;

    case 'number':
      control = (
        <input
          {...common}
          className="field"
          type="number"
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(event) =>
            onChange(event.target.value === '' ? null : Number(event.target.value))
          }
        />
      );
      break;

    case 'select':
      control = (
        <select
          {...common}
          className="field"
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          {!field.required && <option value="">— none —</option>}
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
      break;

    case 'checkbox':
      control = (
        <label className="inline-flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-fg">
          <input
            {...common}
            type="checkbox"
            className="h-4 w-4 rounded border-line accent-[color:var(--color-accent)]"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>{field.placeholder ?? 'Enabled'}</span>
        </label>
      );
      break;

    case 'tags':
      control = (
        <input
          {...common}
          className="field"
          placeholder={field.placeholder ?? 'one, two, three'}
          value={asText(value)}
          onChange={(event) =>
            onChange(
              event.target.value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
            )
          }
        />
      );
      break;

    case 'datetime':
      control = (
        <input
          {...common}
          className="field"
          type="datetime-local"
          value={toLocalInput(asText(value))}
          onChange={(event) => onChange(fromLocalInput(event.target.value))}
        />
      );
      break;

    case 'url':
      control = (
        <input
          {...common}
          className="field"
          type="url"
          inputMode="url"
          placeholder={field.placeholder ?? 'https://'}
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      );
      break;

    default:
      control = (
        <input
          {...common}
          className="field"
          type="text"
          placeholder={field.placeholder}
          value={asText(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }

  return (
    <div className={field.full ? 'sm:col-span-2' : undefined}>
      {field.type === 'checkbox' ? null : (
        <label className="label" htmlFor={id}>
          {field.label}
          {field.required && <span className="ml-1 text-accent" aria-hidden="true">*</span>}
        </label>
      )}
      {control}
      {field.help && !error && (
        <p id={`${id}-help`} className="mt-1.5 text-xs leading-relaxed text-muted">
          {field.help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
