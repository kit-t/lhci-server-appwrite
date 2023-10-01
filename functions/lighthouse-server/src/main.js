/**
 * To start server in appwrite function environment
 */
import app from './server.js';
import { AppwriteStorageMethod } from './storage/appwriteStorageMethod.js';

export default async ({ req, res, log, error }) => {
  try {
    const request = new Request(req.url, {
      method: req.method,
      headers: new Headers(req.headers),
      body: req.bodyRaw || undefined,
    });
    const response = await app.fetch(request, {
      log,
      error,
      storageMethod: new AppwriteStorageMethod(process.env.DATABASE_ID),
    });
    return res.send(
      await response.text(),
      response.status,
      Object.fromEntries(response.headers)
    );
  } catch (e) {
    error(e.message);
    return res.send('Internal Server Error', 500);
  }
};
