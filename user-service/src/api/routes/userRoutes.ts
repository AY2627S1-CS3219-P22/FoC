import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { registerSchema } from '../dto/registerDto';
import { loginSchema } from '../dto/loginDto';
import * as userController from '../controllers/userController';

export const userRouter = Router();

// POST /users/register
userRouter.post('/register', validate(registerSchema), userController.register);

// POST /users/login
userRouter.post('/login', validate(loginSchema), userController.login);

// GET /users/me
userRouter.get('/me', authenticate, userController.getMe);

// GET /users
userRouter.get('/', authenticate, requireRole('ADMINISTRATOR'), userController.listUsers);

// GET /users/:id — admin views a specific user (RBAC: normal USER -> 403)
userRouter.get('/:id', authenticate, requireRole('ADMINISTRATOR'), userController.getUserById);
