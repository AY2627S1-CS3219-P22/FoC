import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { registerSchema } from '../dto/registerDto';
import { loginSchema } from '../dto/loginDto';
import * as userController from '../controllers/userController';

// Routes for the /users resource (mounted at /users in app.ts).
export const userRouter = Router();

// POST /users/register — validate the body, then hand off to the controller.
userRouter.post('/register', validate(registerSchema), userController.register);

// POST /users/login — validate credentials shape, then verify + issue a JWT (F2.1).
userRouter.post('/login', validate(loginSchema), userController.login);

// GET /users/me — any authenticated user can read their own profile (F2.3).
// Demonstrates authentication: no/invalid token → 401.
userRouter.get('/me', authenticate, userController.getMe);

// GET /users — ADMINISTRATOR-only. Demonstrates RBAC: a normal USER → 403.
userRouter.get('/', authenticate, requireRole('ADMINISTRATOR'), userController.listUsers);
