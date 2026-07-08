---
id: reading-from-source
sidebar_label: 004 - Integrating with SCMs
title: 004 - Git-tracked TODOs
description: How to ingest TODOs from source code repositories into your plugin
---

Problem: You have TODOs in your source code that you want to ingest with your plugin.

The Backstage backend can reach out to a source control manager (SCM) such as GitHub to read files and extract inline `// TODO` comments from your repositories. This gives you a live view of developer intent directly in your portal without requiring developers to duplicate their notes.

## Authenticating

To read from a GitHub repository, your plugin must present credentials that GitHub accepts. Backstage provides the `ScmIntegrations` and `ScmAuth` services from `@backstage/integration` and `@backstage/integration-react` for this purpose. On the backend, use the `integrations` core service to look up the right credentials for a given repository URL.

First, add the integration service as a dependency in your plugin setup:

```ts
// plugins/todo-backend/src/plugin.ts
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { ScmIntegrations } from '@backstage/integration';

export const todoPlugin = createBackendPlugin({
  pluginId: 'todo',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        httpAuth: coreServices.httpAuth,
        config: coreServices.rootConfig,
        todoList: todoListServiceRef,
      },
      async init({ httpRouter, httpAuth, config, todoList }) {
        const integrations = ScmIntegrations.fromConfig(config);
        const router = await createRouter({
          httpAuth,
          todoList,
          integrations,
        });
        httpRouter.use(router);
      },
    });
  },
});
```

`ScmIntegrations.fromConfig` reads the `integrations` section of your `app-config.yaml` — the same configuration block used by all other Backstage integrations — so you don't need to manage credentials separately in your plugin.

## Querying

With an authenticated integration, you can retrieve a list of files from a repository using the integration's `readUrl` helper or by calling the SCM's search API. For GitHub, the `GithubCredentialsProvider` gives you a token you can pass directly to Octokit or the GitHub REST API.

The typical approach is to search for `TODO` comments by scanning file contents in a target branch:

```ts
import { Octokit } from '@octokit/rest';
import { ScmIntegrations } from '@backstage/integration';

export async function searchTodosInRepo(options: {
  repoUrl: string; // e.g. 'https://github.com/my-org/my-service'
  integrations: ScmIntegrations;
}): Promise<{ path: string; line: number; text: string }[]> {
  const { repoUrl, integrations } = options;

  const integration = integrations.github.byUrl(repoUrl);
  if (!integration) {
    throw new Error(`No GitHub integration found for ${repoUrl}`);
  }

  const credentials = await integration.getCredentials({ url: repoUrl });
  const octokit = new Octokit({ auth: credentials.token });

  const [, owner, repo] = new URL(repoUrl).pathname.split('/');

  // Use GitHub code search to find all TODO comments in the repository
  const { data } = await octokit.search.code({
    q: `TODO repo:${owner}/${repo}`,
    per_page: 100,
  });

  return data.items.map(item => ({
    path: item.path,
    line: 0, // GitHub code search does not return line numbers; fetch the file to get them
    text: item.name,
  }));
}
```

:::note
GitHub's code search API has rate limits and may not return every match for large repositories. For more thorough scanning, fetch the file tree and process individual files as shown in the next section.
:::

## Fetching

Once you have a list of candidate files, fetch their raw content and extract the `// TODO` lines along with their line numbers:

```ts
export async function fetchTodosFromFile(options: {
  owner: string;
  repo: string;
  path: string;
  octokit: Octokit;
}): Promise<{ line: number; text: string }[]> {
  const { owner, repo, path, octokit } = options;

  const { data } = await octokit.repos.getContent({ owner, repo, path });

  if (Array.isArray(data) || data.type !== 'file') {
    return [];
  }

  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  const results: { line: number; text: string }[] = [];

  content.split('\n').forEach((lineText, index) => {
    const match = lineText.match(/\/\/\s*TODO[:\s]+(.*)/i);
    if (match) {
      results.push({ line: index + 1, text: match[1].trim() });
    }
  });

  return results;
}
```

### Wiring it together

Call `searchTodosInRepo` to locate relevant files, then `fetchTodosFromFile` for each result to build a complete list of in-code TODOs. Store these in your database using the `TodoListService` you created in the persistence step:

```ts
const candidates = await searchTodosInRepo({ repoUrl, integrations });

for (const candidate of candidates) {
  const todos = await fetchTodosFromFile({
    owner,
    repo,
    path: candidate.path,
    octokit,
  });

  for (const todo of todos) {
    await todoList.createTodo({
      title: todo.text,
      createdBy: `scm:${repoUrl}/${candidate.path}:${todo.line}`,
    });
  }
}
```

Run this ingestion logic on a schedule using the `scheduler` core service so the catalog stays up to date as developers push new commits.
