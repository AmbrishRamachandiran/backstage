---
id: search
sidebar_label: 002 - Search
title: Integrating with Search
description: How to integrate your plugin with Backstage Search
---

## Search

### What is Backstage Search?

[Backstage Search](../../../features/search/README.md) provides a unified search experience across all the content in your Backstage instance. Instead of each plugin maintaining its own search box, Backstage Search aggregates content from all participating plugins into a single index. Users can search across catalog entities, TechDocs pages, and any other content that plugins choose to expose.

The search system has three main parts:

- **Collators** — backend modules that know how to read data from a plugin and transform it into search documents. Your plugin provides a collator; the search backend schedules it.
- **Search engine** — the underlying index store (Lunr for local development, Elasticsearch or Postgres for production). Plugins don't interact with the engine directly.
- **Search frontend** — the UI that queries the index and renders results. You can customize how your documents are displayed with a custom result component.

### Common integration points

| Integration                 | Description                                                                                                                               |
| :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Document collator**       | A backend module that fetches your plugin's data and returns it as search documents on a schedule. This is the primary integration point. |
| **Result decorator**        | An optional step that enriches documents after they are collected, for example by adding catalog metadata.                                |
| **Search result component** | A frontend component that renders a search result card for documents of your plugin's type.                                               |

## Creating a custom TODO collator

A _collator_ is a class that implements `DocumentCollatorFactory` from `@backstage/plugin-search-backend-node`. The search scheduler calls your collator on a configurable interval and passes the documents it returns to the search engine for indexing.

### Define the document type

First, declare the shape of your search document in your common package so the frontend and backend can share the type:

```ts
// plugins/todo-common/src/search.ts
import { IndexableDocument } from '@backstage/plugin-search-common';

export interface TodoDocument extends IndexableDocument {
  /** The entity that owns this todo, e.g. 'component:default/my-service' */
  owner: string;
  status: 'open' | 'done';
}
```

### Implement the collator factory

Create the collator factory in a new file inside your backend package:

```ts
// plugins/todo-backend/src/search/TodoCollatorFactory.ts
import { Readable } from 'stream';
import { DocumentCollatorFactory } from '@backstage/plugin-search-backend-node';
import { AuthService, LoggerService } from '@backstage/backend-plugin-api';
import { TodoDocument } from '@internal/plugin-todo-common';
import { TodoListService } from '../services/TodoListService';

export class TodoCollatorFactory implements DocumentCollatorFactory {
  readonly type = 'todos';

  private readonly logger: LoggerService;
  private readonly todoList: TodoListService;
  private readonly auth: AuthService;

  static fromConfig(options: {
    logger: LoggerService;
    todoList: TodoListService;
    auth: AuthService;
  }) {
    return new TodoCollatorFactory(options);
  }

  private constructor(options: {
    logger: LoggerService;
    todoList: TodoListService;
    auth: AuthService;
  }) {
    this.logger = options.logger;
    this.todoList = options.todoList;
    this.auth = options.auth;
  }

  async getCollator(): Promise<Readable> {
    return Readable.from(this.execute());
  }

  private async *execute(): AsyncGenerator<TodoDocument> {
    this.logger.info('Collating todos for search');
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: await this.auth.getOwnServiceCredentials(),
      targetPluginId: 'todo',
    });

    const todos = await this.todoList.listTodos(undefined, { token });

    for (const todo of todos) {
      yield {
        title: todo.title,
        text: todo.title,
        location: `/todo/${todo.id}`,
        owner: todo.createdBy ?? '',
        status: todo.status,
      };
    }
  }
}
```

### Register the collator as a search module

Register your collator by creating a backend module for the search plugin:

```ts
// plugins/search-backend-module-todo/src/module.ts
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { searchIndexRegistryExtensionPoint } from '@backstage/plugin-search-backend-node/alpha';
import { todoListServiceRef } from '@internal/plugin-todo-backend';
import { TodoCollatorFactory } from '../todo-backend/src/search/TodoCollatorFactory';

export const searchModuleTodoCollator = createBackendModule({
  pluginId: 'search',
  moduleId: 'todo-collator',
  register(env) {
    env.registerInit({
      deps: {
        indexRegistry: searchIndexRegistryExtensionPoint,
        logger: coreServices.logger,
        auth: coreServices.auth,
        scheduler: coreServices.scheduler,
        todoList: todoListServiceRef,
      },
      async init({ indexRegistry, logger, auth, scheduler, todoList }) {
        indexRegistry.addCollator({
          schedule: scheduler.createScheduledTaskRunner({
            frequency: { minutes: 10 },
            timeout: { minutes: 15 },
          }),
          factory: TodoCollatorFactory.fromConfig({ logger, auth, todoList }),
        });
      },
    });
  },
});
```

Add the module to your backend:

```ts title="packages/backend/src/index.ts"
backend.add(import('@internal/search-backend-module-todo'));
```

### Display TODO results in the search UI

To render a custom card for todo search results, create a result component in your frontend package and pass it to the `SearchResult` component:

```tsx
// plugins/todo/src/components/TodoSearchResultItem.tsx
import React from 'react';
import { Link } from '@backstage/core-components';
import { IndexableDocument } from '@backstage/plugin-search-common';
import { TodoDocument } from '@internal/plugin-todo-common';

export const TodoSearchResultItem = ({
  result,
}: {
  result: IndexableDocument;
}) => {
  const todo = result as TodoDocument;
  return (
    <Link to={todo.location}>
      <strong>{todo.title}</strong>
      <span> — {todo.status}</span>
    </Link>
  );
};
```

Register the component with the search result extension point so it is used for documents of type `todos`.
