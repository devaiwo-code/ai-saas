import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const serverPath = fileURLToPath(new URL('./server.ts', import.meta.url));

describe('server startup', () => {
  it('exits with code 1 and a clear message when STORAGE is invalid', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', serverPath], {
      env: { ...process.env, STORAGE: 'sql', GITHUB_TOKEN: 'ghp_secret' },
      encoding: 'utf8',
      timeout: 15_000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Invalid configuration: STORAGE must be one of memory, prisma (got "sql")',
    );
    expect(result.stderr).not.toContain('ghp_secret');
  });
});
