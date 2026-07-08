---
id: testing
sidebar_label: 005 - Unit testing your plugin
title: 005 - Testing
description: How to write unit tests for your Backstage backend plugin
---

## Testing is important

We've done a lot of manual testing up to this point of functionality. Let's start putting those assumptions into code that we can run on every change to ensure things are working correctly.

## Router-level testing

Router-level tests exercise your HTTP handlers directly without starting a real backend. They are fast, focused, and the right tool for checking that each route returns the correct status code, response shape, and error behaviour.

Use `supertest` to send HTTP requests against an Express router in-process. Mock the services your router depends on so tests stay isolated from the database and the catalog:

```ts
// plugins/todo-backend/src/service/router.test.ts
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { mockCredentials, mockServices } from '@backstage/backend-test-utils';

describe('GET /todos', () => {
  it('returns an empty list when there are no todos', async () => {
    const todoList = {
      listTodos: jest.fn().mockResolvedValue([]),
      createTodo: jest.fn(),
      getTodo: jest.fn(),
    };

    const router = await createRouter({
      httpAuth: mockServices.httpAuth(),
      permissions: mockServices.permissions.mock(),
      todoList,
    });

    const app = express().use(router);
    const res = await request(app)
      .get('/todos')
      .set('Authorization', mockCredentials.user.header());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [] });
  });

  it('returns 401 when no credentials are provided', async () => {
    const router = await createRouter({
      httpAuth: mockServices.httpAuth(),
      permissions: mockServices.permissions.mock(),
      todoList: {
        listTodos: jest.fn(),
        createTodo: jest.fn(),
        getTodo: jest.fn(),
      },
    });

    const app = express().use(router);
    const res = await request(app).get('/todos');

    expect(res.status).toBe(401);
  });
});
```

`mockCredentials` and `mockServices` from `@backstage/backend-test-utils` give you pre-built fakes for all core services. Use `mockCredentials.user.header()` to produce a valid `Authorization` header that the `httpAuth` mock will accept.

## Plugin-level testing

Plugin-level tests spin up a complete in-memory backend using `startTestBackend` from `@backstage/backend-test-utils`. They exercise the full request lifecycle — service wiring, middleware, routing — without a real network or a real database:

```ts
// plugins/todo-backend/src/plugin.test.ts
import { startTestBackend } from '@backstage/backend-test-utils';
import { todoPlugin } from './plugin';
import request from 'supertest';

describe('todoPlugin', () => {
  it('registers the /api/todo/todos route', async () => {
    const { server } = await startTestBackend({
      features: [todoPlugin],
    });

    const res = await request(server).get('/api/todo/todos');
    // The route exists and requires auth; without credentials we expect 401
    expect(res.status).toBe(401);
  });

  it('creates and lists a todo', async () => {
    const { server } = await startTestBackend({
      features: [todoPlugin],
    });

    const createRes = await request(server)
      .post('/api/todo/todos')
      .set('Authorization', 'Bearer mock-user-token')
      .send({ title: 'Write docs' });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({ title: 'Write docs' });

    const listRes = await request(server)
      .get('/api/todo/todos')
      .set('Authorization', 'Bearer mock-user-token');

    expect(listRes.status).toBe(200);
    expect(listRes.body.items).toHaveLength(1);
    expect(listRes.body.items[0]).toMatchObject({ title: 'Write docs' });
  });
});
```

`startTestBackend` replaces database, config, and auth services with in-memory implementations automatically, so you get realistic end-to-end behaviour without any infrastructure.

## OpenAPI testing

If your plugin exposes an OpenAPI schema (via `@backstage/backend-openapi-utils`), you can validate that every response your router produces matches the declared schema. This prevents documentation drift and catches breaking changes before they reach consumers.

### Integration with Jest tests

Use the `createOpenApiRouter` wrapper from `@backstage/backend-openapi-utils` in your router setup and then assert response shapes against the schema in your Jest tests:

```ts
// plugins/todo-backend/src/service/router.test.ts
import { wrapInOpenApiTestMiddleware } from '@backstage/backend-openapi-utils/testUtils';

describe('OpenAPI contract', () => {
  it('GET /todos response matches the declared schema', async () => {
    const router = await createRouter({
      /* ... */
    });
    const app = express().use(wrapInOpenApiTestMiddleware(router));

    const res = await request(app)
      .get('/todos')
      .set('Authorization', mockCredentials.user.header());

    // The middleware validates the response body against the OpenAPI spec
    // and throws if there is a schema violation
    expect(res.status).toBe(200);
  });
});
```

`wrapInOpenApiTestMiddleware` intercepts every response and runs it through the schema validator. Any field that is present but not declared, or any required field that is missing, causes the test to fail with a descriptive error message.

### Fuzzing

Fuzzing automatically generates unexpected or malformed inputs and checks that your route handlers don't crash, leak stack traces, or return 5xx errors. It is most useful for the request body parsing and validation logic in your `POST` and `PUT` handlers.

A simple property-based fuzzer using `fast-check` covers the most common edge cases:

```ts
import * as fc from 'fast-check';

describe('POST /todos fuzzing', () => {
  it('never returns 5xx for arbitrary request bodies', async () => {
    const router = await createRouter({
      /* ... */
    });
    const app = express().use(router);

    await fc.assert(
      fc.asyncProperty(fc.anything(), async body => {
        const res = await request(app)
          .post('/todos')
          .set('Authorization', mockCredentials.user.header())
          .set('Content-Type', 'application/json')
          .send(JSON.stringify(body));

        // A well-behaved handler validates input and returns 4xx, never 5xx
        expect(res.status).toBeLessThan(500);
      }),
      { numRuns: 200 },
    );
  });
});
```

`fc.anything()` generates strings, numbers, arrays, nested objects, `null`, `undefined`, and unusual Unicode values. The test asserts that your handler always responds with a 4xx client error rather than crashing with a 5xx server error.

Run `yarn test` to execute all of the above and confirm your plugin is solid before opening a pull request.
