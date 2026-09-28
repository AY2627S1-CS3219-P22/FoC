import { z } from 'zod';

// Validates the POST /users/login body. Deliberately minimal: a credential check
// only needs "present and a string", not the strong registration password rules.
// Requiring non-empty fields also satisfies F2.1.2 (reject login with missing input).
export const loginSchema = z.object({
  email: z.email('Invalid email address').transform((e) => e.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
