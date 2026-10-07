import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config.js';

describe('loadConfig', () => {
  it('applies defaults for an empty env', () => {
    const config = loadConfig({});
    expect(config.PORT).toBe(4000);
    expect(config.HOST).toBe('127.0.0.1');
    expect(config.STORAGE).toBe('memory');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.GITHUB_TOKEN).toBeUndefined();
    expect(config.DATABASE_URL).toBeUndefined();
  });

  it('parses valid values', () => {
    const config = loadConfig({
      PORT: '8080',
      HOST: '0.0.0.0',
      STORAGE: 'prisma',
      LOG_LEVEL: 'debug',
      GITHUB_TOKEN: 'token',
      DATABASE_URL: 'postgresql://user:pw@localhost:5432/db',
    });
    expect(config).toEqual({
      PORT: 8080,
      HOST: '0.0.0.0',
      STORAGE: 'prisma',
      LOG_LEVEL: 'debug',
      GITHUB_TOKEN: 'token',
      DATABASE_URL: 'postgresql://user:pw@localhost:5432/db',
    });
  });

  it('rejects an invalid STORAGE value with a message naming the key and allowed values', () => {
    expect(() => loadConfig({ STORAGE: 'sql' })).toThrow(ConfigError);
    expect(() => loadConfig({ STORAGE: 'sql' })).toThrow(
      'Invalid configuration: STORAGE must be one of memory, prisma (got "sql")',
    );
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
  });

  it('rejects a PORT outside 1-65535', () => {
    expect(() => loadConfig({ PORT: '70000' })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: '0' })).toThrow(ConfigError);
  });

  it('rejects a non-integer PORT', () => {
    expect(() => loadConfig({ PORT: '40.5' })).toThrow(ConfigError);
  });

  it('starts with STORAGE=memory and no GITHUB_TOKEN or DATABASE_URL', () => {
    const config = loadConfig({ STORAGE: 'memory' });
    expect(config.STORAGE).toBe('memory');
    expect(config.GITHUB_TOKEN).toBeUndefined();
    expect(config.DATABASE_URL).toBeUndefined();
  });

  it('treats empty optional values as undefined', () => {
    const config = loadConfig({ GITHUB_TOKEN: '', DATABASE_URL: '' });
    expect(config.GITHUB_TOKEN).toBeUndefined();
    expect(config.DATABASE_URL).toBeUndefined();
  });

  it('rejects an invalid DATABASE_URL without echoing its value', () => {
    let error: unknown;
    try {
      loadConfig({ DATABASE_URL: 'not a url with s3cret' });
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as Error).message).toMatch(/DATABASE_URL/);
    expect((error as Error).message).not.toContain('s3cret');
  });

  it('never echoes GITHUB_TOKEN in the error message', () => {
    expect(() => loadConfig({ STORAGE: 'sql', GITHUB_TOKEN: 'ghp_x' })).toThrow(ConfigError);
    try {
      loadConfig({ STORAGE: 'sql', GITHUB_TOKEN: 'ghp_x' });
    } catch (err) {
      expect((err as Error).message).not.toContain('ghp_x');
    }
  });

  it('lists every invalid key', () => {
    expect(() => loadConfig({ STORAGE: 'sql', PORT: 'abc', LOG_LEVEL: 'loud' })).toThrow(
      ConfigError,
    );
    try {
      loadConfig({ STORAGE: 'sql', PORT: 'abc', LOG_LEVEL: 'loud' });
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain('PORT');
      expect(message).toContain('STORAGE');
      expect(message).toContain('LOG_LEVEL');
    }
  });
});
