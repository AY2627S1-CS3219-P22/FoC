export const ROLES = ['USER', 'ADMINISTRATOR'] as const;
export type Role = (typeof ROLES)[number];

export interface AuthenticatedUser {
  id: string;
  roles: Role[];
  expiresAt: Date;
}

// A future UserServiceAuthProvider implements this same contract. Controllers
// and business services receive identities, never provider-specific tokens.
export interface AuthProvider {
  authenticate(token: string): Promise<AuthenticatedUser>;
}

export class AuthenticationError extends Error {
  constructor() {
    super('Invalid or expired token.');
    this.name = 'AuthenticationError';
  }
}
