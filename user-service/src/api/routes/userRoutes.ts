import { Router } from 'express';
import { validate } from '../middleware/validate';
import { registerSchema } from '../dto/registerDto';
import * as userController from '../controllers/userController';

// Routes for the /users resource (mounted at /users in app.ts).
export const userRouter = Router();

// POST /users/register — validate the body, then hand off to the controller.
userRouter.post('/register', validate(registerSchema), userController.register);
