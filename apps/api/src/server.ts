import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { ConfigError, loadConfig, type Config } from './config.js';

// Resolves to the repo root from both src/ (tsx) and dist/ (node).
const rootEnvPath = fileURLToPath(new URL('../../../.env', import.meta.url));

function readConfig(): Config {
  // loadEnvFile does not override variables that are already set.
  if (existsSync(rootEnvPath)) {
    process.loadEnvFile(rootEnvPath);
  }
  try {
    return loadConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

const config = readConfig();
const app = buildApp({ logger: { level: config.LOG_LEVEL } });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
