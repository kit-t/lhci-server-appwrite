import { HTTPException } from 'hono/http-exception';
import adminTokenUtils from '@lhci/server/src/api/storage/auth.js';

const { hashAdminToken } = adminTokenUtils;

export const validateBuildToken = async (c, next) => {
  const project = await c.env.storageMethod.findProjectById(
    c.req.param('projectId')
  );
  if (!project) throw new HTTPException(403, { message: 'Invalid token' });

  const buildToken = c.req.header('x-lhci-build-token') || '';
  if (buildToken !== project.token)
    throw new HTTPException(403, { message: 'Invalid token' });

  await next();
};

export const validateAdminToken = async (c, next) => {
  const project = await c.env.storageMethod.findProjectById(
    c.req.param('projectId')
  );
  if (!project) throw new HTTPException(403, { message: 'Invalid token' });

  const adminToken = c.req.header('x-lhci-admin-token') || '';
  const hashedAdminToken = hashAdminToken(adminToken, project.id);

  if (hashedAdminToken !== project.adminToken)
    throw new HTTPException(403, { message: 'Invalid token' });

  await next();
};
