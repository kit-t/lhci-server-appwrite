# lighthouse-server

Inspired by [`@lhci/server`](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/server.md), this server compatible with [`@lhci/cli@0.12.x`](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md) to save historical Lighthouse data, displays trends in a dashboard, and offers comparison between builds.

## Deployment

- Create database and deploy collections based on [appwrite.json](../../appwrite.json)

- Deploy appwrite function and set environment variables

## ⚙️ Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node (18.0)   |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm ci`      |
| Permissions       | `any`         |
| Timeout (Seconds) | 60            |

## 🔒 Environment Variables

```sh
# Appwrite API Key
APPWRITE_API_KEY=
# Appwrite endpoint
APPWRITE_ENDPOINT=
# Database id
DATABASE_ID=
# Basic auth username
BASIC_AUTH_USERNAME=
# Basic auth password
BASIC_AUTH_PASSWORD=
```

## Basic Auth

At the moment, basic auth will only be enforced if both `BASIC_AUTH_USERNAME` & `BASIC_AUTH_PASSWORD` are set in the environment variables.

Basic auth check is only applicable for project creation (route: POST /v1/project).
