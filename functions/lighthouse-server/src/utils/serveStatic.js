import { join } from 'path';
import { existsSync, lstatSync, readFileSync } from 'fs';
import { getMimeType } from 'hono/utils/mime';

export const serveStatic = (options = {}) => {
  return async (c) => {
    const url = new URL(c.req.url);
    const filename = options.path ?? decodeURIComponent(url.pathname);
    let path = join(
      options.root ?? '',
      options.rewriteRequestPath
        ? options.rewriteRequestPath(filename)
        : filename
    );

    if (!existsSync(path)) {
      return next();
    }
    if (lstatSync(path).isDirectory()) path = join(path, 'index.html');

    const mimeType = getMimeType(path);

    if (mimeType) {
      // redirect font file as unable to serve statically
      if (mimeType.startsWith('font')) {
        if (filename.includes('material'))
          return c.redirect(
            'https://cdn.jsdelivr.net/npm/material-design-icons-woff@3.0.1/MaterialIcons-Regular.woff'
          );
        if (filename.includes('roboto'))
          return c.redirect(
            'https://cdn.jsdelivr.net/npm/roboto-regular-woff@0.7.1/Roboto-Regular.woff'
          );
      }
      c.header('Content-Type', mimeType);
    }

    const { size } = lstatSync(path);
    c.header('Content-Length', size.toString());

    return ['HEAD', 'OPTIONS'].includes(c.req.method)
      ? c.body(null)
      : c.body(readFileSync(path).toString());
  };
};
