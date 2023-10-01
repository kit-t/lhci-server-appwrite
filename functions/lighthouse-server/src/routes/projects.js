import { Hono } from 'hono';
import {
  validateAdminToken,
  validateBuildToken,
} from '../middlewares/validateToken.js';
import { basicAuth } from '../middlewares/auth.js';

const projects = new Hono();

projects.get('/', async (c) => {
  const projects = await c.env.storageMethod.getProjects();
  return c.json(
    projects.map((project) => ({ ...project, token: '', adminToken: '' }))
  );
});

projects.post('/', basicAuth, async (c) => {
  const unsavedProject = await c.req.json();
  const project = await c.env.storageMethod.createProject(unsavedProject);
  return c.json(project);
});

projects.post('/lookup', async (c) => {
  const { token } = (await c.req.json()) || {};
  const project = await c.env.storageMethod.findProjectByToken(token);
  if (!project) return c.notFound();
  return c.json({ ...project, adminToken: '' });
});

projects.get('/:slug{slug:(.+)}', async (c) => {
  const project = await c.env.storageMethod.findProjectBySlug(
    c.req.param('slug').slice(5)
  );
  if (!project) return c.notFound();
  return c.json({ ...project, token: '', adminToken: '' });
});

projects.get('/:projectId', async (c) => {
  const project = await c.env.storageMethod.findProjectById(
    c.req.param('projectId')
  );
  if (!project) return c.notFound();
  return c.json({ ...project, token: '', adminToken: '' });
});

projects.put('/:projectId', validateAdminToken, async (c) => {
  await c.env.storageMethod.updateProject({
    ...(await c.req.json()),
    id: c.req.param('projectId'),
  });
  return c.body(null, 204);
});

projects.delete('/:projectId', validateAdminToken, async (c) => {
  await c.env.storageMethod.deleteProject(c.req.param('projectId'));
  return c.body(null, 204);
});

projects.get('/:projectId/builds', async (c) => {
  const builds = await c.env.storageMethod.getBuilds(
    c.req.param('projectId'),
    c.req.query()
  );
  return c.json(builds);
});

projects.get('/:projectId/urls', async (c) => {
  const urls = await c.env.storageMethod.getUrls(c.req.param('projectId'));
  return c.json(urls);
});

projects.get('/:projectId/branches', async (c) => {
  const branches = await c.env.storageMethod.getBranches(
    c.req.param('projectId')
  );
  return c.json(branches);
});

projects.post('/:projectId/builds', validateBuildToken, async (c) => {
  const unsavedBuild = {
    ...(await c.req.json()),
    projectId: c.req.param('projectId'),
  };
  const build = await c.env.storageMethod.createBuild(unsavedBuild);
  return c.json(build);
});

projects.delete(
  '/:projectId/builds/:buildId',
  validateAdminToken,
  async (c) => {
    await c.env.storageMethod.deleteBuild(
      c.req.param('projectId'),
      c.req.param('buildId')
    );
    return c.body(null, 204);
  }
);

projects.get('/:projectId/builds/:buildId', async (c) => {
  const build = await c.env.storageMethod.findBuildById(
    c.req.param('projectId'),
    c.req.param('buildId')
  );

  if (!build) return c.notFound();
  return c.json(build);
});

projects.get('/:projectId/builds/:buildId/ancestor', async (c) => {
  const build = await c.env.storageMethod.findAncestorBuildById(
    c.req.param('projectId'),
    c.req.param('buildId')
  );

  if (!build) return c.notFound();
  return c.json(build);
});

projects.get('/:projectId/builds/:buildId/runs', async (c) => {
  const runs = await c.env.storageMethod.getRuns(
    c.req.param('projectId'),
    c.req.param('buildId'),
    c.req.query()
  );
  return c.json(runs);
});

projects.post(
  '/:projectId/builds/:buildId/runs',
  validateBuildToken,
  async (c) => {
    const unsavedRun = {
      ...(await c.req.json()),
      projectId: c.req.param('projectId'),
      buildId: c.req.param('buildId'),
    };
    const run = await c.env.storageMethod.createRun(unsavedRun);
    return c.json(run);
  }
);

projects.get('/:projectId/builds/:buildId/urls', async (c) => {
  const urls = await c.env.storageMethod.getUrls(
    c.req.param('projectId'),
    c.req.param('buildId')
  );
  return c.json(urls);
});

projects.put(
  '/:projectId/builds/:buildId/lifecycle',
  validateBuildToken,
  async (c) => {
    // temporary disable this check because appwrite server return 502 for request with content-type application/json & body "sealed"
    // if ((await c.req.json()) !== 'sealed') throw new Error('Invalid lifecycle');
    await c.env.storageMethod.sealBuild(
      c.req.param('projectId'),
      c.req.param('buildId')
    );
    return c.body(null, 204);
  }
);

projects.get('/:projectId/builds/:buildId/statistics', async (c) => {
  const statistics = await c.env.storageMethod.getStatistics(
    c.req.param('projectId'),
    c.req.param('buildId')
  );
  return c.json(statistics);
});

export default projects;
