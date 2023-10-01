# lighthouse-server

Inspired by [`@lhci/server`](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/server.md), this server compatible with [`@lhci/cli@0.12.x`](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md) to save historical Lighthouse data, displays trends in a dashboard, and offers comparison between builds.

## Built With

- [appwrite](https://appwrite.io/)
- [hono](https://hono.dev/)
- [@lhci/server](https://www.npmjs.com/package/@lhci/server)

## Deployment

- Create project, database and deploy collections based on [appwrite.json](./appwrite.json)

- Deploy appwrite function (lighthouse-server) and set environment variables (refer [here](./functions/lighthouse-server/README.md))

## Usage

- After deployment, obtain the function domain.

- Install Lighthouse CI CLI tool globally.
```sh
npm install -g @lhci/cli@0.12.x
```

- Refer guide [here](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md) on how to set up and configure Lighthouse CI on your project. Be sure to add basic auth username and password if you set those in your deployment environment variables.

- Create project by running `lhci wizard` (refer [here](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md#project-creation) for more details, remember to use the function domain obtained as URL of your LHCI server)

- Run `lhci autorun` to collect and save lighthouse results for your project on the server you just deployed. Unfortunately, `lhci autorun` will fail with `502 Bad Gateway` when it sends PUT request to seal build at path `/v1/projects/:projectId/builds/:buildId/lifecycle` with `Content-Type: application/json` in the header and `"sealed"` in the body. You can manually make a request without `"sealed"` in the body to seal build and generate statistics for the data you just uploaded.

## Demo

View demo [here](http://65183896735e382566da.appwrite.global/)
