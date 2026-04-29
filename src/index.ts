import { buildApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabase, connectToDatabase } from './db/prisma.js';

const start = async () => {
  await connectToDatabase();
  const app = await buildApp();

  app.addHook('onClose', async () => {
    await closeDatabase();
  });

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
};

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
