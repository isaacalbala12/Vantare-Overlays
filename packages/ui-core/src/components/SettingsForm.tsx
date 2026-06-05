import React from 'react';
import { z, ZodNumber, ZodBoolean, ZodEnum, ZodArray, ZodString, ZodDefault } from 'zod';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type FieldType = 'number' | 'boolean' | 'enum' | 'string' | 'range' | 'array-enum';

interface FieldMeta {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  enumValues?: string[];
  min?: number;
  max?: number;
  step?: number;
}

interface SettingsFormProps<T extends Record<string, unknown>> {
  schema: z.ZodType<any, any, any>;
  values: T;
  onChange: (partial: Partial<T>) => void;
  testId?: string;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function camelToTitle(camel: string): string {
  return camel
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function unwrapDefault(field: any): any {
  if (field instanceof ZodDefault) {
    return unwrapDefault(field._def.innerType);
  }
  return field;
}

function getFieldTypeName(field: any): string {
  const unwrapped = unwrapDefault(field);
  if (unwrapped instanceof ZodNumber) return 'ZodNumber';
  if (unwrapped instanceof ZodBoolean) return 'ZodBoolean';
  if (unwrapped instanceof ZodEnum) return 'ZodEnum';
  if (unwrapped instanceof ZodArray) return 'ZodArray';
  if (unwrapped instanceof ZodString) return 'ZodString';
  return 'ZodString';
}

function getFieldMeta(schema: z.ZodObject<any, any, any, any, any>): FieldMeta[] {
  return Object.entries(schema.shape).map(([key, field]: [string, any]) => {
    const unwrapped = unwrapDefault(field);
    const typeName = getFieldTypeName(field);

    if (typeName === 'ZodNumber') {
      const checks = unwrapped._def.checks || [];

      const minCheck = checks.find((c: any) => c.kind === 'min');
      const maxCheck = checks.find((c: any) => c.kind === 'max');

      const min: number | undefined = minCheck?.value;
      const max: number | undefined = maxCheck?.value;

      const isRange = min === 0 && max === 1;
      const isInt = checks.some((c: any) => c.kind === 'int');

      if (isRange) {
        return {
          key,
          label: camelToTitle(key),
          type: 'range',
          required: true,
          min: 0,
          max: 1,
          step: 0.01,
        };
      }

      let step = isInt ? 1 : 0.1;

      return {
        key,
        label: camelToTitle(key),
        type: 'number',
        required: true,
        min,
        max,
        step,
      };
    }

    if (typeName === 'ZodBoolean') {
      return { key, label: camelToTitle(key), type: 'boolean', required: true };
    }

    if (typeName === 'ZodEnum') {
      return {
        key,
        label: camelToTitle(key),
        type: 'enum',
        enumValues: unwrapped._def.values,
        required: true,
      };
    }

    if (typeName === 'ZodArray') {
      const innerTypeName = getFieldTypeName(unwrapped._def?.type);
      if (innerTypeName === 'ZodEnum') {
        return {
          key,
          label: camelToTitle(key),
          type: 'array-enum',
          enumValues: unwrapped._def.type._def.values,
          required: true,
        };
      }
    }

    return { key, label: camelToTitle(key), type: 'string', required: true };
  });
}

function getSchemaDefaults(schema: z.ZodObject<any, any, any, any, any>): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(schema.shape)) {
    const unwrapped = unwrapDefault(field);
    const typeName = getFieldTypeName(field);

    const defaultValue = (field as any)._def?.defaultValue;
    if (defaultValue !== undefined) {
      defaults[key] = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    } else if (typeName === 'ZodBoolean') {
      defaults[key] = false;
    } else if (typeName === 'ZodNumber') {
      defaults[key] = 0;
    } else if (typeName === 'ZodString') {
      defaults[key] = '';
    } else if (typeName === 'ZodEnum') {
      defaults[key] = unwrapped._def.values[0];
    } else if (typeName === 'ZodArray') {
      defaults[key] = [];
    } else {
      defaults[key] = '';
    }
  }

  return defaults;
}

function validateField(schema: z.ZodObject<any, any, any, any, any>, key: string, value: unknown): string | null {
  try {
    const fieldSchema = (schema.shape as Record<string, z.ZodType<any>>)[key];
    fieldSchema.parse(value);
    return null;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return err.errors[0]?.message || 'Invalid value';
    }
    return 'Invalid value';
  }
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

function asZodObject(schema: z.ZodType<any, any, any>): z.ZodObject<any, any, any, any, any> {
  return schema as unknown as z.ZodObject<any, any, any, any, any>;
}

export function SettingsForm<T extends Record<string, unknown>>({
  schema,
  values,
  onChange,
  testId = 'settings',
}: SettingsFormProps<T>) {
  const zodObj = React.useMemo(() => asZodObject(schema), [schema]);
  const fields = React.useMemo(() => getFieldMeta(zodObj), [zodObj]);
  const [errors, setErrors] = React.useState<Record<string, string | null>>({});
  const [draft, setDraft] = React.useState<Record<string, unknown>>(values);

  React.useEffect(() => {
    setDraft(values);
  }, [values]);

  const handleChange = (key: string, value: unknown) => {
    const newDraft = { ...draft, [key]: value };
    setDraft(newDraft);

    const error = validateField(zodObj, key, value);
    setErrors((prev) => ({ ...prev, [key]: error }));

    onChange(newDraft as Partial<T>);
  };

  const handleSave = () => {
    const newErrors: Record<string, string | null> = {};
    let hasError = false;

    for (const field of fields) {
      const error = validateField(zodObj, field.key, draft[field.key]);
      newErrors[field.key] = error;
      if (error) hasError = true;
    }

    setErrors(newErrors);

    if (!hasError) {
      onChange(draft as Partial<T>);
    }
  };

  const handleReset = () => {
    const defaults = getSchemaDefaults(zodObj);
    setDraft(defaults);
    setErrors({});
    onChange(defaults as Partial<T>);
  };

  const renderField = (field: FieldMeta) => {
    const fieldId = `${testId}-field-${field.key}`;
    const value = draft[field.key];
    const error = errors[field.key];

    switch (field.type) {
      case 'number':
      case 'range':
        return (
          <input
            id={fieldId}
            data-testid={fieldId}
            type={field.type === 'range' ? 'range' : 'number'}
            min={field.min}
            max={field.max}
            step={field.step}
            value={(value as number) ?? 0}
            onChange={(e) => handleChange(field.key, parseFloat(e.target.value))}
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id={fieldId}
              data-testid={fieldId}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleChange(field.key, e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/10 text-white focus:ring-white/30"
            />
            <span className="text-sm text-white/80"></span>
          </label>
        );

      case 'enum':
        return (
          <select
            id={fieldId}
            data-testid={fieldId}
            value={(value as string) ?? ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            {field.enumValues?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'array-enum':
        return (
          <select
            id={fieldId}
            data-testid={fieldId}
            multiple
            value={(value as string[]) ?? []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
              handleChange(field.key, selected);
            }}
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            {field.enumValues?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'string':
      default:
        return (
          <input
            id={fieldId}
            data-testid={fieldId}
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
          />
        );
    }
  };

  return (
    <div className="glass-panel space-y-4 p-4" data-testid={testId}>
      <div className="grid grid-cols-1 gap-4">
        {fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <label htmlFor={`${testId}-field-${field.key}`} className="text-xs font-medium uppercase tracking-wider text-white/60">
              {field.label}
            </label>
            {renderField(field)}
            {errors[field.key] && (
              <span className="text-xs text-red-400" data-testid={`${testId}-error-${field.key}`}>
                {errors[field.key]}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={handleSave}
          data-testid={`${testId}-save`}
          className="rounded bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleReset}
          data-testid={`${testId}-reset`}
          className="rounded bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
