import type { Roles } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; roles: Roles[] };
      /** Plaintext OTP recovered from the X-OTP header. */
      otp?: string;
    }
  }
}

export {};
