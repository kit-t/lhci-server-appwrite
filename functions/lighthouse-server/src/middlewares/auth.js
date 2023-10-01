import { basicAuth as honoBasicAuth } from 'hono/basic-auth';

export const basicAuth =
  process.env.BASIC_AUTH_USERNAME && process.env.BASIC_AUTH_PASSWORD
    ? honoBasicAuth({
        username: process.env.BASIC_AUTH_USERNAME,
        password: process.env.BASIC_AUTH_PASSWORD,
      })
    : async (_, next) => await next();
