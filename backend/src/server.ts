import { buildApp } from './app.js';
import { closePool, query } from './db/pool.js';
import { env } from './env.js';

async function main(): Promise<void> {
  await query('SELECT 1');
  const app = buildApp();
  await app.listen({ port: env.port, host: '0.0.0.0' });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down.`);
    await app.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
