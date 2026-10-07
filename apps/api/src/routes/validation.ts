import type { z } from 'zod';
import { ValidationError, zodIssuesToDetails } from '../errors.js';

/**
 * Validates `value` against `schema` and returns the parsed result.
 * Throws ValidationError (400 VALIDATION_ERROR) with one detail per Zod issue.
 */
export function parseWith<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
): z.output<Schema> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError('Request validation failed', zodIssuesToDetails(result.error));
  }
  return result.data;
}
