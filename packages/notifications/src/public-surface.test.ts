import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, expectTypeOf, it } from 'vitest';

import * as notificationsPublicApi from './index.js';
import type {
  NotificationChannel,
  NotificationDispatchBatchResult,
  NotificationDispatchOptions,
  NotificationDispatchRequest,
  NotificationLifecycleEvent,
  Notifications,
  NotificationsEventPublisher,
  NotificationsModuleOptions,
  NotificationsQueueAdapter,
  NotificationsStatusAdapterInput,
} from './index.js';

describe('@fluojs/notifications public API surface', () => {
  it('keeps documented supported root-barrel exports stable', () => {
    expect(notificationsPublicApi).toHaveProperty('NotificationsModule');
    expect(notificationsPublicApi).toHaveProperty('createNotificationsProviders');
    expect(notificationsPublicApi).toHaveProperty('NotificationsService');
    expect(notificationsPublicApi).toHaveProperty('NOTIFICATIONS');
    expect(notificationsPublicApi).toHaveProperty('NOTIFICATION_CHANNELS');
    expect(notificationsPublicApi).toHaveProperty('createNotificationsPlatformStatusSnapshot');
    expect(notificationsPublicApi).toHaveProperty('NotificationsConfigurationError');
    expect(notificationsPublicApi).toHaveProperty('NotificationChannelNotFoundError');
    expect(notificationsPublicApi).toHaveProperty('NotificationQueueNotConfiguredError');
  });

  it('keeps documented TypeScript-only contracts stable enough for leaf packages', () => {
    expectTypeOf<NotificationDispatchRequest>().toMatchTypeOf<{
      channel: string;
      payload: Record<string, unknown>;
    }>();
    expectTypeOf<NotificationDispatchOptions>().toMatchTypeOf<{
      publishLifecycleEvents?: boolean;
      queue?: boolean;
      signal?: AbortSignal;
    }>();
    expectTypeOf<NotificationChannel>().toHaveProperty('channel');
    expectTypeOf<NotificationChannel>().toHaveProperty('send');
    expectTypeOf<NotificationsQueueAdapter>().toHaveProperty('enqueue');
    expectTypeOf<NotificationsEventPublisher>().toHaveProperty('publish');
    expectTypeOf<Notifications>().toHaveProperty('dispatch');
    expectTypeOf<Notifications>().toHaveProperty('dispatchMany');
    expectTypeOf<NotificationsModuleOptions>().toMatchTypeOf<{
      channels?: readonly NotificationChannel[];
    }>();
    expectTypeOf<NotificationLifecycleEvent>().toMatchTypeOf<{
      channel: string;
      name:
        | 'notification.dispatch.requested'
        | 'notification.dispatch.queued'
        | 'notification.dispatch.delivered'
        | 'notification.dispatch.failed';
      occurredAt: string;
    }>();
    expectTypeOf<NotificationDispatchBatchResult>().toMatchTypeOf<{
      failed: number;
      queued: number;
      succeeded: number;
    }>();
    expectTypeOf<NotificationsStatusAdapterInput>().toMatchTypeOf<{
      bulkQueueThreshold: number;
      channelsRegistered: number;
      eventPublisherConfigured: boolean;
      queueConfigured: boolean;
    }>();
  });

  it('keeps the README helper contract aligned with the documented root-barrel API', () => {
    const readme = readFileSync(resolve(import.meta.dirname, '../README.md'), 'utf8');
    const koreanReadme = readFileSync(resolve(import.meta.dirname, '../README.ko.md'), 'utf8');

    expect(readme).toContain('`createNotificationsProviders(...)` is the supported manual-composition helper when applications need the same provider normalization outside `NotificationsModule.forRoot(...)`.');
    expect(readme).toContain('The helper preserves the same `NOTIFICATIONS`, `NOTIFICATION_CHANNELS`, and `NotificationsService` wiring that `NotificationsModule.forRoot(...)` installs.');
    expect(koreanReadme).toContain('`createNotificationsProviders(...)`는 애플리케이션이 `NotificationsModule.forRoot(...)` 밖에서 동일한 provider 정규화 구성을 재사용해야 할 때 지원되는 manual-composition helper입니다.');
    expect(koreanReadme).toContain('이 helper는 `NotificationsModule.forRoot(...)`가 구성하는 `NOTIFICATIONS`, `NOTIFICATION_CHANNELS`, `NotificationsService` wiring을 동일하게 유지합니다.');
  });

  it('hides internal normalized options token from the root barrel', () => {
    expect(notificationsPublicApi).not.toHaveProperty('NOTIFICATIONS_OPTIONS');
    expect(notificationsPublicApi).not.toHaveProperty('NotificationsOperationMode');
  });
});
