import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { registerErrorHandling } from './errors.js';
import { healthRoutes } from './routes/health.js';

export interface AppDependencies {
  logger?: FastifyServerOptions['logger'];
}

/**
 * Composes the API: error handling and all routes. Pure composition — no env reads and no I/O.
 * Returns the instance before ready(), so callers can still register plugins or routes.
 */
export function buildApp(deps: AppDependencies = {}): FastifyInstance {
  const app = Fastify({ logger: deps.logger ?? false });

  registerErrorHandling(app);
  void app.register(healthRoutes);

  return app;
}
