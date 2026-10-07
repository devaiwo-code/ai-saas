import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

/** Keys whose values must never appear in error messages. */
const SECRET_KEYS = new Set(['GITHUB_TOKEN', 'DATABASE_URL']);

const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().min(1).default('127.0.0.1'),
  STORAGE: z.enum(['memory', 'prisma']).default('memory'),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  GITHUB_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
  DATABASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
});

export type Config = z.infer<typeof configSchema>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Parses and validates the API configuration from environment variables.
 * Throws ConfigError with one line per invalid key; secret values are never echoed.
 */
export function loadConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined>): Config {
  const result = configSchema.safeParse(env);
  if (result.success) {
    return result.data;
  }
  const problems = result.error.issues.map((issue) => {
    const key = String(issue.path[0] ?? '(root)');
    return `${key} ${describeIssue(issue)}${formatReceived(key, env[key])}`;
  });
  throw new ConfigError(`Invalid configuration: ${problems.join('; ')}`);
}

function describeIssue(issue: z.core.$ZodIssue): string {
  switch (issue.code) {
    case 'invalid_value':
      return `must be one of ${issue.values.map(String).join(', ')}`;
    case 'invalid_type':
      return issue.expected === 'number' ? 'must be a number' : `must be a ${issue.expected}`;
    case 'too_small':
      return `must be at least ${String(issue.minimum)}`;
    case 'too_big':
      return `must be at most ${String(issue.maximum)}`;
    case 'invalid_format':
      return `must be a valid ${issue.format}`;
    default:
      return issue.message;
  }
}

function formatReceived(key: string, value: string | undefined): string {
  if (value === undefined || SECRET_KEYS.has(key)) {
    return '';
  }
  return ` (got ${JSON.stringify(value)})`;
}
