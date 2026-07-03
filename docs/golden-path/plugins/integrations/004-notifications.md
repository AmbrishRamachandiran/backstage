---
id: notifications
sidebar_label: 004 - Notifications
title: Integrating with Notifications
description: How to integrate your plugin with Backstage Notifications
---

## Notifications

### What are Backstage Notifications?

[Backstage Notifications](../../../notifications/index.md) is a system that lets plugins and external services send messages to Backstage users. Notifications appear on the dedicated `/notifications` page in the frontend and can also be forwarded to external channels such as email via _processors_.

There are two types of notifications:

- **Broadcast** — sent to all users in the Backstage instance.
- **Entity** — sent to specific catalog entities, typically `User` or `Group` kinds. The notification system resolves group membership automatically, so a notification to a group reaches every member.

Notifications are fire-and-forget messages. They are not intended for inter-process communication or request/response flows.

### Common integration points

Backend plugins send notifications by declaring a dependency on the `notificationService` from `@backstage/plugin-notifications-node`. You pass it into your router or service and call `notificationService.send(...)` wherever the trigger occurs.

| Integration                    | Description                                                                                                               |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **`notificationService.send`** | The primary integration point. Call this from any backend plugin to emit a notification.                                  |
| **Scheduled notifications**    | Combine the scheduler service with `notificationService` to send time-based notifications, such as due-date reminders.    |
| **Processors**                 | Optional backend modules that intercept outgoing notifications and forward them to external channels (e.g. email, Slack). |

## TODO with an alarm

A common use case is sending a notification to the todo's creator when a due date arrives. The backend scheduler service lets you run a recurring task that checks for overdue todos and fires a notification for each one.

### Add the notification service dependency

Update your plugin to declare a dependency on `notificationService`:

```ts
// plugins/todo-backend/src/plugin.ts
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { notificationService } from '@backstage/plugin-notifications-node';

export const todoPlugin = createBackendPlugin({
  pluginId: 'todo',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
        scheduler: coreServices.scheduler,
        notifications: notificationService,
        todoList: todoListServiceRef,
      },
      async init({
        httpRouter,
        httpAuth,
        permissions,
        scheduler,
        notifications,
        todoList,
      }) {
        // Schedule the alarm check
        await scheduler.scheduleTask({
          id: 'todo-alarm-check',
          frequency: { minutes: 1 },
          timeout: { minutes: 1 },
          fn: async () => {
            const overdue = await todoList.listOverdueTodos();
            for (const todo of overdue) {
              await notifications.send({
                recipients: {
                  type: 'entity',
                  entityRef: todo.createdBy,
                },
                payload: {
                  title: `Reminder: "${todo.title}" is due`,
                  description: `Your TODO item is past its due date.`,
                  link: `/todo/${todo.id}`,
                  severity: 'normal',
                  topic: 'todo-alarm',
                },
              });
              // Mark as notified so we don't send it again
              await todoList.markAlarmSent(todo.id);
            }
          },
        });

        const router = await createRouter({ httpAuth, permissions, todoList });
        httpRouter.use(router);
      },
    });
  },
});
```

### Add `dueDate` and `alarmSent` fields to your TODO

To support alarms, extend your `TodoItem` type and database schema with two new fields:

```ts
export interface TodoItem {
  id: string;
  title: string;
  createdBy: string;
  createdAt?: string;
  dueDate?: string; // ISO 8601 date string
  alarmSent?: boolean; // true after the alarm notification has been sent
}
```

Add a migration that adds these columns to your `todos` table (make `alarm_sent` `NOT NULL` with a default of `false`), then update `listOverdueTodos` in `TodoListService` to return todos where `dueDate` is in the past and `alarmSent` is false:

```ts
async listOverdueTodos(): Promise<TodoItem[]> {
  return this.#database('todos')
    .where('due_date', '<', new Date().toISOString())
    .where('alarm_sent', false)
    .select();
}

async markAlarmSent(id: string): Promise<void> {
  await this.#database('todos').where({ id }).update({ alarm_sent: true });
}
```

## Create TODOs for other people and notify them

When a user creates a todo and assigns it to someone else, the assignee should receive a notification so they are aware of the new task.

### Send a notification on create

Update your `POST /todos` route handler to send a notification to the assignee whenever a todo is created with an `assignee` field different from the creator:

```ts
router.post('/todos', async (req, res) => {
  const parsed = todoSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new InputError(parsed.error.toString());
  }

  const credentials = await httpAuth.credentials(req, { allow: ['user'] });

  const decision = (
    await permissions.authorize([{ permission: todoCreatePermission }], {
      credentials,
    })
  )[0];

  if (decision.result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError();
  }

  const todo = await todoList.createTodo({
    title: parsed.data.title,
    createdBy: credentials.principal.userEntityRef,
    assignee: parsed.data.assignee,
  });

  // Notify the assignee if they are a different person from the creator
  if (todo.assignee && todo.assignee !== credentials.principal.userEntityRef) {
    await notifications.send({
      recipients: {
        type: 'entity',
        entityRef: todo.assignee,
      },
      payload: {
        title: `New TODO assigned to you: "${todo.title}"`,
        description: `${credentials.principal.userEntityRef} has assigned you a new TODO item.`,
        link: `/todo/${todo.id}`,
        severity: 'normal',
        topic: 'todo-assignment',
      },
    });
  }

  res.status(201).json(todo);
});
```

The `entityRef` in the `recipients` field must match the entity reference of a `User` or `Group` in the catalog, for example `user:default/ada`. The notifications backend resolves this to the correct user accounts automatically.
