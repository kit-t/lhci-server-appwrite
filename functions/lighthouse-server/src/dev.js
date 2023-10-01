/**
 * To start the server in node.js environment
 */
import 'dotenv/config';
import { serve } from '@hono/node-server';

import app from './server.js';
import { AppwriteStorageMethod } from './storage/appwriteStorageMethod.js';

serve({
  fetch: (request, env, executionCtx) =>
    app.fetch(
      request,
      {
        ...env,
        log: console.log,
        error: console.error,
        storageMethod: new AppwriteStorageMethod(process.env.DATABASE_ID),
      },
      executionCtx
    ),
  port: 9001,
});
