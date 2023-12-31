import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { join } from 'path';
import * as url from 'url';

import projects from './routes/projects.js';
import { serveStatic } from './utils/serveStatic.js';
import { cache } from './middlewares/cache.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const app = new Hono({ strict: false });

// version should be compatible with target @lhci/cli
app.get('/version', (c) => c.text('0.12.0'));

// healthcheck
app.use('/healthz', (c) => c.text('healthy'));

// api routes
app.route('/v1/projects', projects);

// Serve UI components & assets static files
app.get('/', (c) => c.redirect('/app'));

app.use(
  '/app',
  serveStatic({
    root: join(__dirname, '../node_modules/@lhci/server/dist'),
    rewriteRequestPath: (path) => path.replace(/^\/app/, ''),
  })
);

app.use(
  '/app/chunks/*',
  cache({ cacheControl: 'max-age=31536000, immutable' }),
  serveStatic({
    root: join(__dirname, '../node_modules/@lhci/server/dist'),
    rewriteRequestPath: (path) => path.replace(/^\/app/, ''),
  })
);

app.use(
  '/app/assets/*',
  cache({ cacheControl: 'max-age=31536000, immutable' }),
  serveStatic({
    root: join(__dirname, '../node_modules/@lhci/server/dist'),
    rewriteRequestPath: (path) => path.replace(/^\/app/, ''),
  })
);

app.use(
  '/app/*',
  serveStatic({
    path: join(__dirname, '../node_modules/@lhci/server/dist', '/index.html'),
  })
);

// error handling
app.onError((e, c) => {
  if (e instanceof HTTPException) {
    c.env.error(`{ status: ${e.status}, message: ${e.message} }`);
    return e.getResponse();
  }
  c.env.error(`{ message: ${e.message}, details: ${JSON.stringify(e)} }`);
  const statusCode = e.code >= 400 && e.code <= 599 ? e.code : 422;
  return c.json({ type: e.type, message: e.message }, statusCode);
});

export default app;
