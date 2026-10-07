import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { buildApp } from './app.js';
import { NotFoundError } from './errors.js';
import { parseWith } from './routes/validation.js';

let app: FastifyInstance;

afterEach(async () => {
  await app.close();
});

describe('buildApp', () => {
  it('GET /health returns 200 with status ok', async () => {
    app = buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    app = buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route GET /does-not-exist not found' },
    });
  });

  it('returns a generic JSON 500 without leaking error details', async () => {
    app = buildApp({ logger: false });
    app.get('/boom', () => {
      throw new Error('secret detail');
    });
    const res = await app.inject({ method: 'GET', url: '/boom' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(res.body).not.toContain('secret detail');
    expect(res.body).not.toContain('at ');
  });

  it('maps an AppError to its status and code', async () => {
    app = buildApp({ logger: false });
    app.get('/missing', () => {
      throw new NotFoundError('PROJECT_NOT_FOUND', 'Project 42 not found');
    });
    const res = await app.inject({ method: 'GET', url: '/missing' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'PROJECT_NOT_FOUND', message: 'Project 42 not found' },
    });
  });

  it('maps a parseWith failure to a 400 VALIDATION_ERROR with details', async () => {
    app = buildApp({ logger: false });
    app.post('/items', (request) => parseWith(z.object({ name: z.string().min(1) }), request.body));
    const res = await app.inject({ method: 'POST', url: '/items', payload: { name: '' } });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual([{ path: 'name', message: expect.any(String) }]);
  });

  it('maps a thrown ZodError to a 400 VALIDATION_ERROR', async () => {
    app = buildApp({ logger: false });
    app.get('/zod', () => z.number().parse('x'));
    const res = await app.inject({ method: 'GET', url: '/zod' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('returns a JSON 400 for malformed JSON bodies', async () => {
    app = buildApp({ logger: false });
    app.post('/echo', (request) => request.body);
    const res = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{"broken":',
    });
    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    const body = res.json();
    expect(body.error.code).toEqual(expect.any(String));
    expect(body.error.message).toEqual(expect.any(String));
    expect(body.error.stack).toBeUndefined();
  });

  it('returns a JSON 415 for unsupported content types', async () => {
    app = buildApp({ logger: false });
    app.post('/echo', (request) => request.body);
    const res = await app.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/xml' },
      payload: '<a/>',
    });
    expect(res.statusCode).toBe(415);
    expect(res.json().error.code).toEqual(expect.any(String));
  });
});
