import type { RequestHandler } from 'express';
import type { RegisterInput } from '../dto/registerDto';
import * as userService from '../services/userService';

// POST /users/register — create a new account (F1).
export const register: RequestHandler = async (req, res) => {
  const result = await userService.register(req.body as RegisterInput);

  if (!result.ok) {
    res.status(409).json({
      error: 'Conflict',
      message: `An account with this ${result.field} already exists.`,
    });
    return;
  }

  res.status(201).json({ user: result.user });
};
