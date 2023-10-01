export const cache = ({ cacheControl }) => {
  return async (c, next) => {
    c.header('Cache-Control', cacheControl);
    await next();
  };
};
