import crypto from 'node:crypto';
import { Client, Databases, Query } from 'node-appwrite';

import StorageMethod from '@lhci/server/src/api/storage/storage-method.js';
import adminTokenUtils from '@lhci/server/src/api/storage/auth.js';

/**
 * set global.crypto to fix error "crypto is not defined"
 * possibly due to some underlying package is using crypto without import/require
 */
const global = (0, eval)('this');
global.crypto = crypto;

const { randomUUID } = crypto;
const { generateAdminToken, hashAdminToken } = adminTokenUtils;

const FETCH_ALL = Query.limit(Number.MAX_SAFE_INTEGER);

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const transformDocument = (document) => {
  if (!document) return null;
  const {
    $id: id,
    $createdAt: createdAt,
    $updatedAt: updatedAt,
    $permissions,
    $databaseId,
    $collectionId,
    ...attributes
  } = document;
  return { id, createdAt, updatedAt, ...attributes };
};

export class AppwriteStorageMethod extends StorageMethod {
  constructor(databaseId) {
    super();
    this.databaseId = databaseId ?? 'lighthouse';
  }

  /**
   * @param {LHCI.ServerCommand.StorageOptions} options
   * @return {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async initialize(options) {
    throw new Error('Unimplemented');
  }

  /** @return {Promise<void>} */
  async close() {
    // NOOP
  }

  /**
   * @return {Promise<Array<LHCI.ServerCommand.Project>>}
   */
  async getProjects() {
    const { documents } = await databases.listDocuments(
      this.databaseId,
      'projects'
    );
    return documents.map(transformDocument);
  }

  /**
   * @param {string} projectId
   * @return {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async deleteProject(projectId) {
    // get all builds
    const { documents } = await databases.listDocuments(
      this.databaseId,
      'builds',
      [Query.value('projectId', projectId), Query.select(['$id']), FETCH_ALL]
    );

    await Promise.all([
      // delete all builds
      ...documents.map(({ $id }) => this.deleteBuild(projectId, $id)),
      // delete project
      databases.deleteDocument(this.databaseId, 'projects', projectId),
    ]);
  }

  /**
   * @param {string} token
   * @return {Promise<LHCI.ServerCommand.Project | undefined>}
   */
  // eslint-disable-next-line no-unused-vars
  async findProjectByToken(token) {
    const {
      documents: [project],
    } = await databases.listDocuments(this.databaseId, 'projects', [
      Query.equal('token', [token]),
      Query.limit(1),
    ]);
    return transformDocument(project);
  }

  /**
   * @param {string} projectId
   * @return {Promise<LHCI.ServerCommand.Project | undefined>}
   */
  // eslint-disable-next-line no-unused-vars
  async findProjectById(projectId) {
    const project = await databases.getDocument(
      this.databaseId,
      'projects',
      projectId
    );
    return transformDocument(project);
  }

  /**
   * @param {string} slug
   * @return {Promise<LHCI.ServerCommand.Project | undefined>}
   */
  // eslint-disable-next-line no-unused-vars
  async findProjectBySlug(slug) {
    const {
      documents: [project],
    } = await databases.listDocuments(this.databaseId, 'projects', [
      Query.equal('slug', [slug]),
      Query.limit(1),
    ]);
    return transformDocument(project);
  }

  /**
   * @param {StrictOmit<LHCI.ServerCommand.Project, 'id'|'token'|'adminToken'>} project
   * @return {Promise<LHCI.ServerCommand.Project>}
   */
  // eslint-disable-next-line no-unused-vars
  async createProject(unsavedProject) {
    return StorageMethod.createProjectWithUniqueSlug(this, unsavedProject);
  }

  /**
   * @param {Pick<LHCI.ServerCommand.Project, 'id'|'baseBranch'|'externalUrl'|'name'>} project
   * @return {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async updateProject({ id, name, externalUrl, baseBranch }) {
    if (name.length < 4) throw new E422('Project name too short');

    await databases.updateDocument(this.databaseId, 'projects', id, {
      name,
      externalUrl,
      baseBranch,
    });
  }

  /**
   * @param {string} projectId
   * @param {LHCI.ServerCommand.GetBuildsOptions} [options]
   * @return {Promise<LHCI.ServerCommand.Build[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async getBuilds(projectId, options = {}) {
    const { limit = 10, ...filters } = options;
    const { documents } = await databases.listDocuments(
      this.databaseId,
      'builds',
      [
        Query.equal('projectId', [projectId]),
        ...Object.entries(filters).map(([key, value]) =>
          Query.equal(key, [value])
        ),
        Query.limit(limit),
      ]
    );
    return documents.map(transformDocument);
  }

  /**
   * @param {string} projectId
   * @return {Promise<Array<{branch: string}>>}
   */
  // eslint-disable-next-line no-unused-vars
  async getBranches(projectId) {
    const { documents } = await databases.listDocuments(
      this.databaseId,
      'builds',
      [Query.equal('projectId', projectId), Query.select(['branch']), FETCH_ALL]
    );
    const uniqueBranches = new Set();
    return documents.reduce((arr, ele) => {
      if (!uniqueBranches.has(ele.branch)) {
        arr.push(ele);
        uniqueBranches.add(ele.branch);
      }
      return arr;
    }, []);
  }

  /**
   * @param {string} projectId
   * @param {string} buildId
   * @return {Promise<LHCI.ServerCommand.Build | undefined>}
   */
  // eslint-disable-next-line no-unused-vars
  async findBuildById(projectId, buildId) {
    const project =
      buildId.length === 36
        ? await databases.getDocument(this.databaseId, 'builds', buildId)
        : (
            await databases.listDocuments(this.databaseId, 'builds', [
              Query.equal('projectId', [projectId]),
              Query.startsWith('hash', buildId),
              Query.limit(1),
            ])
          ).documents[0];
    return transformDocument(project);
  }

  /**
   * @param {string} projectId
   * @param {string} buildId
   * @return {Promise<LHCI.ServerCommand.Build | undefined>}
   */
  // eslint-disable-next-line no-unused-vars
  async findAncestorBuildById(projectId, buildId) {
    const project = await databases.getDocument(
      this.databaseId,
      'projects',
      projectId
    );
    const build = await databases.getDocument(
      this.databaseId,
      'builds',
      buildId
    );
    if (!project || !build || (build && build.projectId !== projectId))
      return undefined;

    if (build.ancestorHash) {
      const {
        documents: [ancestorsByHash],
      } = await databases.listDocuments(this.databaseId, 'builds', [
        Query.equal('projectId', projectId),
        Query.equal('branch', project.baseBranch),
        Query.equal('hash', build.ancestorHash),
        Query.limit(1),
      ]);

      if (ancestorsByHash) return transformDocument(ancestorsByHash);
    }

    const where = [
      Query.equal('projectId', projectId),
      Query.equal('branch', project.baseBranch),
      Query.notEqual('$id', build.$id),
    ];

    const {
      documents: [nearestBuildBefore],
    } = await databases.listDocuments(this.databaseId, 'builds', [
      ...where,
      Query.lessThanEqual('runAt', build.runAt),
      Query.orderDesc('runAt'),
      Query.limit(1),
    ]);

    if (build.branch === project.baseBranch) {
      return nearestBuildBefore;
    }

    const {
      documents: [nearestBuildAfter],
    } = databases.listDocuments(this.databaseId, 'builds', [
      ...where,
      Query.greaterThanEqual('runAt', build.runAt),
      Query.orderAsc('runAt'),
      Query.limit(1),
    ]);

    /** @param {string} date */
    const getDateDistance = (date) =>
      Math.abs(new Date(date).getTime() - new Date(build.runAt).getTime());

    const [nearestBuild] = [nearestBuildBefore, nearestBuildAfter].sort(
      (a, b) => getDateDistance(a.runAt) - getDateDistance(b.runAt)
    );

    return transformDocument(nearestBuild);
  }

  /**
   * @param {StrictOmit<LHCI.ServerCommand.Build, 'id'>} unsavedBuild
   * @return {Promise<LHCI.ServerCommand.Build>}
   */
  // eslint-disable-next-line no-unused-vars
  async createBuild(unsavedBuild) {
    if (unsavedBuild.lifecycle !== 'unsealed')
      throw new Error('Invalid lifecycle value');
    try {
      const build = await databases.createDocument(
        this.databaseId,
        'builds',
        randomUUID(),
        unsavedBuild
      );
      return transformDocument(build);
    } catch (err) {
      if (err.code === 409) {
        err.message = `Build already exists for hash "${unsavedBuild.hash}"`;
      }
      throw err;
    }
  }

  /**
   * @param {string} projectId
   * @param {string} buildId
   * @return {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async sealBuild(projectId, buildId) {
    let build = await this.findBuildById(projectId, buildId);
    if (!build) throw new Error('Invalid build');
    build = { ...build, lifecycle: 'sealed' };

    // validating buildId
    const runs = await this.getRuns(projectId, buildId);
    if (!runs.length) throw new Error('Invalid build');

    // updating lifecycle
    await databases.updateDocument(this.databaseId, 'builds', buildId, {
      lifecycle: 'sealed',
    });

    // creating statistics
    const { representativeRuns } = await StorageMethod.createStatistics(
      this,
      build,
      {}
    );

    // updating run representative flag
    await Promise.all(
      representativeRuns.map((run) =>
        databases.updateDocument(this.databaseId, 'runs', run.id, {
          representative: true,
        })
      )
    );
  }

  /**
   * @param {Date} runAt
   * @return {Promise<LHCI.ServerCommand.Build[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async findBuildsBeforeTimestamp(runAt) {
    const { documents } = await databases.listDocuments(
      this.databaseId,
      'builds',
      [Query.lessThan('runAt', runAt), Query.orderAsc('runAt')]
    );
    return documents.map(transformDocument);
  }

  /**
   * @param {string} projectId
   * @param {string} buildId
   * @return {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async deleteBuild(projectId, buildId) {
    const [{ documents: runs }, { documents: statistics }] = await Promise.all([
      databases.listDocuments(this.databaseId, 'runs', [
        Query.equal('buildId', ['buildId']),
        Query.select(['$id']),
        FETCH_ALL,
      ]),
      databases.listDocuments(this.databaseId, 'statistics', [
        Query.equal('buildId', ['buildId']),
        Query.select(['$id']),
        FETCH_ALL,
      ]),
    ]);

    await Promise.all([
      runs.map(({ $id }) =>
        databases.deleteDocument(this.databaseId, 'runs', $id)
      ),
      statistics.map(({ $id }) =>
        databases.deleteDocument(this.databaseId, 'statistics', $id)
      ),
      databases.deleteDocument(this.databaseId, 'builds', buildId),
    ]);
  }

  /**
   * @param {string} projectId
   * @param {string} buildId
   * @param {LHCI.ServerCommand.GetRunsOptions} [options]
   * @return {Promise<LHCI.ServerCommand.Run[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async getRuns(projectId, buildId, options) {
    const { documents } = await databases.listDocuments(
      this.databaseId,
      'runs',
      [Query.equal('projectId', [projectId]), Query.equal('buildId', [buildId])]
    );
    return documents.map(transformDocument);
  }

  /**
   * @param {string} projectId
   * @param {string} [buildId]
   * @return {Promise<Array<{url: string}>>}
   */
  // eslint-disable-next-line no-unused-vars
  async getUrls(projectId, buildId) {
    const { documents } = await databases.listDocuments(
      this.databaseId,
      'runs',
      [
        Query.equal('projectId', projectId),
        ...(buildId ? [Query.equal('buildId', buildId)] : []),
        Query.select(['url']),
        FETCH_ALL,
      ]
    );
    const uniqueUrls = new Set();
    return documents.reduce((arr, ele) => {
      if (!uniqueUrls.has(ele.url)) {
        arr.push(ele);
        uniqueUrls.add(ele.url);
      }
      return arr;
    }, []);
  }

  /**
   * @param {StrictOmit<LHCI.ServerCommand.Run, 'id'>} unsavedRun
   * @return {Promise<LHCI.ServerCommand.Run>}
   */
  // eslint-disable-next-line no-unused-vars
  async createRun(unsavedRun) {
    const build = await this.findBuildById(
      unsavedRun.projectId,
      unsavedRun.buildId
    );

    if (!build || build.lifecycle !== 'unsealed')
      throw new Error('Invalid build');
    if (typeof unsavedRun.lhr !== 'string') throw new Error('Invalid LHR');
    if (unsavedRun.representative)
      throw new Error('Invalid representative value');
    if (unsavedRun.url.length > 256) throw new Error('URL too long');

    const run = await databases.createDocument(
      this.databaseId,
      'runs',
      randomUUID(),
      unsavedRun
    );
    return transformDocument(run);
  }

  /**
   * @param {string} projectId
   * @param {string} buildId
   * @return {Promise<Array<LHCI.ServerCommand.Statistic>>}
   */
  // eslint-disable-next-line no-unused-vars
  async getStatistics(projectId, buildId) {
    return StorageMethod.getOrCreateStatistics(this, projectId, buildId);
  }

  /**
   * @param {string} projectId
   * @return {Promise<string>}
   */
  // eslint-disable-next-line no-unused-vars
  async _resetAdminToken(projectId) {
    const token = generateAdminToken();
    await databases.updateDocument(this.databaseId, 'projects', projectId, {
      adminToken: hashAdminToken(token, projectId),
    });
    return token;
  }

  /**
   * @param {string} projectId
   * @return {Promise<string>}
   */
  // eslint-disable-next-line no-unused-vars
  async _resetProjectToken(projectId) {
    const token = randomUUID();
    await databases.updateDocument(this.databaseId, 'projects', projectId, {
      token,
    });
    return token;
  }

  /**
   * @param {StrictOmit<LHCI.ServerCommand.Project, 'id'|'token'|'adminToken'>} project
   * @return {Promise<LHCI.ServerCommand.Project>}
   */
  // eslint-disable-next-line no-unused-vars
  async _createProject(unsavedProject) {
    if (unsavedProject.name.length < 4)
      throw new Error('Project name too short');
    const projectId = randomUUID();
    const adminToken = generateAdminToken();
    const project = await databases.createDocument(
      this.databaseId,
      'projects',
      projectId,
      {
        ...unsavedProject,
        baseBranch: unsavedProject.baseBranch || 'main',
        adminToken: hashAdminToken(adminToken, projectId),
        token: randomUUID(),
      }
    );

    // Replace the adminToken with the original non-hashed version.
    // This will be the only time it's readable other than reset.
    return { ...transformDocument(project), adminToken };
  }

  /**
   * @param {StrictOmit<LHCI.ServerCommand.Statistic, 'id'>} unsavedStatistic
   * @param {*} [extras]
   * @return {Promise<LHCI.ServerCommand.Statistic>}
   */
  // eslint-disable-next-line no-unused-vars
  async _createOrUpdateStatistic(unsavedStatistic, extras) {
    const { projectId, buildId, url, name } = unsavedStatistic;
    // looking up existing statistic;
    const {
      documents: [existing],
    } = await databases.listDocuments(this.databaseId, 'statistics', [
      Query.equal('projectId', [projectId]),
      Query.equal('buildId', [buildId]),
      Query.equal('url', [url]),
      Query.equal('name', [name]),
    ]);

    /** @type {LHCI.ServerCommand.Statistic} */
    let statistic;
    if (existing) {
      // existing statistic found, updating data
      statistic = await databases.updateDocument(
        this.databaseId,
        'statistics',
        existing.id,
        unsavedStatistic
      );
    } else {
      // no existing statistic found, creating one
      statistic = await databases.createDocument(
        this.databaseId,
        'statistics',
        randomUUID(),
        unsavedStatistic
      );
    }

    return transformDocument(statistic);
  }

  /**
   * @param {string} projectId
   * @param {string} buildId
   * @return {Promise<Array<LHCI.ServerCommand.Statistic>>}
   */
  // eslint-disable-next-line no-unused-vars
  async _getStatistics(projectId, buildId) {
    const { documents } = await databases.listDocuments(
      this.databaseId,
      'statistics',
      [
        Query.equal('projectId', [projectId]),
        Query.equal('buildId', [buildId]),
        FETCH_ALL,
      ]
    );
    return documents.map(transformDocument);
  }

  /**
   * @param {string} projectId
   * @param {string} buildId
   * @return {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async _invalidateStatistics(projectId, buildId) {
    const { documents } = await databases.listDocuments(
      this.databaseId,
      'statistics',
      [
        Query.equal('projectId', [projectId]),
        Query.equal('buildId', [buildId]),
        Query.select(['$id']),
        FETCH_ALL,
      ]
    );
    await Promise.all(
      documents.map(({ $id }) =>
        databases.updateDocument(this.databaseId, 'statistics', $id, {
          version: 0,
        })
      )
    );
  }
}
