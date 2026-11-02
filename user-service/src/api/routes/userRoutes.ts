// AI Assistance Disclosure:
// Tool: Claude Code (Claude Opus), dates: 2026-09-27 – 2026-10-19
// Scope: AI generated the register, login, /me, admin list, admin get-by-id,
// refresh, PATCH /me and admin grant/revoke routes.
// Author review: Author specified the endpoints and access rules, reviewed the
// code and approved. See user-service/ai/usage-log.md, entries 004, 008, 009,
// 010, 015, 020.
//
// AI Assistance Disclosure:
// Tool: OpenAI Codex, 2026-11-02 (Asia/Singapore).
// Scope: Added the author-specified DELETE /users/me route. Author review:
// Reviewed, manually tested, and approved. See user-service/ai/usage-log.md,
// entry 025.

import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { registerSchema } from '../dto/registerDto';
import { loginSchema } from '../dto/loginDto';
import { updateProfileSchema } from '../dto/updateProfileDto';
import * as userController from '../controllers/userController';

export const userRouter = Router();

// POST /users/register
userRouter.post('/register', validate(registerSchema), userController.register);

// POST /users/login
userRouter.post('/login', validate(loginSchema), userController.login);

// POST /users/refresh
userRouter.post('/refresh', userController.refresh);

// POST /users/logout
userRouter.post('/logout', userController.logout);

// GET /users/me
userRouter.get('/me', authenticate, userController.getMe);

// PATCH /users/me
userRouter.patch('/me', authenticate, validate(updateProfileSchema), userController.updateMe);

// DELETE /users/me
userRouter.delete('/me', authenticate, userController.deleteMe);

// GET /users
userRouter.get('/', authenticate, requireRole('ADMINISTRATOR'), userController.listUsers);

// GET /users/:id
userRouter.get('/:id', authenticate, requireRole('ADMINISTRATOR'), userController.getUserById);

// POST /users/:id/admin
userRouter.post('/:id/admin', authenticate, requireRole('ADMINISTRATOR'), userController.grantAdmin);

// DELETE /users/:id/admin
userRouter.delete('/:id/admin', authenticate, requireRole('ADMINISTRATOR'), userController.revokeAdmin);
