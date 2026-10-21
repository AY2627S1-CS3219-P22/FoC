// Message producer: user service
// Consumers: credit service, order service

interface UserEventBase {
    eventId: string;
    occurredAt: string;
    /** UUID string. */
    userId: string;
  }
  
  /** New user registered. Credit creates a credit account (zero balance) for userId. */
  export interface UserCreated extends UserEventBase {
    type: 'user.created';
  }
  
  /**
   * User soft-deleted. Credit snapshots the balance and archives credit history;
   * order archives order history. Both keep the data until `purgeAfter`.
   */
  export interface UserDeleted extends UserEventBase {
    type: 'user.deleted';
    deletedAt: string;
    /** deletedAt + 4 years, set once by the user service so consumers never compute it themselves. */
    purgeAfter: string;
  }
  
  /** User logged back in within the retention window. Consumers restore archived data. */
  export interface UserRestored extends UserEventBase {
    type: 'user.restored';
  }
  
  export type UserEvent = UserCreated | UserDeleted | UserRestored;