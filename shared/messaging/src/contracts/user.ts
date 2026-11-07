// AI Assistance Disclosure: ChatGPT (Codex), 2026-11-02.
// Scope: Align user.deleted with the team-supplied event contract; review pending; see ../../../../order-service/usage-log.md.
// Message producer: user service
// Consumers: credit service, order service

import { z } from 'zod';

const userEventBaseSchema = z.object({
    eventId: z.string(),
    occurredAt: z.string(),
    /** UUID string? */
    userId: z.string(),
  });
  
  /** New user registered. Credit initializes the account using its initial-grant policy. */
  export const userCreatedSchema = userEventBaseSchema.extend({
    type: z.literal('user.created'),
  });
  
  /**
   * User row deleted. Order receives the old ID and deletion timestamps;
   * User owns the four-year archive and sends no later purge event.
   */
  export const userDeletedSchema = userEventBaseSchema.extend({
    type: z.literal('user.deleted'),
    eventId: z.string().trim().min(1),
    userId: z.string().trim().min(1),
    occurredAt: z.iso.datetime({ offset: true }),
    deletedAt: z.iso.datetime({ offset: true }),
  });
  
  /** User logged back in within the retention window. Consumers restore archived data. */
  export const userRestoredSchema = userEventBaseSchema.extend({
    type: z.literal('user.restored'),
  });
  
  export const userEventSchema = z.discriminatedUnion('type', [
    userCreatedSchema,
    userDeletedSchema,
    userRestoredSchema,
  ]);

  export type UserCreated = z.infer<typeof userCreatedSchema>;
  export type UserDeleted = z.infer<typeof userDeletedSchema>;
  export type UserRestored = z.infer<typeof userRestoredSchema>;
  export type UserEvent = z.infer<typeof userEventSchema>;
