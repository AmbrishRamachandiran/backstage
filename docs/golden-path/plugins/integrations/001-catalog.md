---
id: catalog
sidebar_label: 001 - Catalog
title: Integrating with Catalog
description: How to integrate your plugin with the Backstage Software Catalog
---

## Software Catalog

### What is the Software Catalog?

The [Backstage Software Catalog](../../../features/software-catalog/software-catalog-overview.md) is a centralized system that tracks ownership, metadata, and relationships for all the software in your organization. Entities in the catalog — services, libraries, websites, APIs, teams, and more — are described by YAML files stored in source control and ingested by Backstage at regular intervals.

Plugins integrate with the catalog in two broad ways:

- **Reading from the catalog** — using the catalog client to look up entities, resolve ownership, or enrich plugin data with organizational context.
- **Extending the catalog** — registering custom entity kinds, adding annotations that your plugin understands, or providing entity providers that ingest new entities from external sources.

### Integration Points

The most common catalog integration points for a plugin are:

| Integration             | Description                                                                                                                               |
| :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Annotations**         | Key-value metadata attached to an entity in its YAML file. Your plugin reads annotations to discover configuration on a per-entity basis. |
| **Entity providers**    | Backend modules that push entities into the catalog from an external source on a schedule.                                                |
| **Custom entity kinds** | A new first-class kind (e.g. `Todo`) with its own schema, validation, and UI representation.                                              |
| **Catalog client**      | A service your backend uses at runtime to query existing catalog data.                                                                    |

## Adding a new `backstage.io/todo` annotation

The simplest way to associate todos with a catalog entity is to add an annotation to the entity's YAML file. Your plugin reads this annotation at runtime to know which todos belong to which entity.

### Define the annotation

Annotations are arbitrary strings, but by convention they follow a `domain/key` format. Add a constant for your annotation so it can be imported from a shared package:

```ts
// plugins/todo-common/src/annotations.ts
export const TODO_ANNOTATION = 'backstage.io/todo-source';
```

### Read the annotation in the backend

In your route handler, use the catalog client to resolve the entity and read the annotation value:

```ts
import { TODO_ANNOTATION } from '@internal/plugin-todo-common';

router.get('/todos/:entityRef', async (req, res) => {
  const entity = await catalogClient.getEntityByRef(req.params.entityRef, {
    token,
  });

  if (!entity) {
    throw new NotFoundError(`Entity ${req.params.entityRef} not found`);
  }

  const todoSource = entity.metadata.annotations?.[TODO_ANNOTATION];
  if (!todoSource) {
    res.json({ items: [] });
    return;
  }

  const todos = await todoList.listTodos({ source: todoSource });
  res.json({ items: todos });
});
```

### Add the annotation to an entity

In the entity's `catalog-info.yaml`, add the annotation under `metadata.annotations`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    backstage.io/todo-source: https://github.com/my-org/my-service
spec:
  type: service
  owner: my-team
  lifecycle: production
```

## Custom TODO Entity Kind

For more advanced use cases, you can represent todos as first-class catalog entities with their own kind. This gives you all the catalog features for free: ownership, relations, filtering, and the entity detail page.

### Define the entity type

Create a type in your common package that describes the shape of a `Todo` entity:

```ts
// plugins/todo-common/src/kinds/TodoEntity.ts
import { Entity } from '@backstage/catalog-model';

export interface TodoEntity extends Entity {
  apiVersion: 'backstage.io/v1alpha1';
  kind: 'Todo';
  spec: {
    title: string;
    owner: string;
    dueDate?: string;
    status: 'open' | 'done';
  };
}

export function isTodoEntity(entity: Entity): entity is TodoEntity {
  return entity.kind === 'Todo';
}
```

### Register a custom entity validator

To have the catalog accept your new kind, register a catalog module that adds a custom entity policy:

```ts
// plugins/catalog-backend-module-todo/src/module.ts
import { createBackendModule } from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { TodoEntityPolicy } from './TodoEntityPolicy';

export const catalogModuleTodo = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'todo',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
      },
      async init({ catalog }) {
        catalog.addEntityPolicy(new TodoEntityPolicy());
      },
    });
  },
});
```

The `TodoEntityPolicy` validates that every entity with `kind: Todo` has the required `spec.title` and `spec.owner` fields before it is persisted.

### Create a Todo entity in source control

Once the module is installed, you can create `Todo` entities in any catalog-info file:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Todo
metadata:
  name: migrate-to-postgres
  namespace: default
spec:
  title: Migrate the production database to PostgreSQL
  owner: user:default/ada
  dueDate: '2025-12-31'
  status: open
```
