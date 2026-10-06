import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env, jwtPrivateKey } from '../../env';
import type { RegisterInput } from '../dto/registerDto';
import type { LoginInput } from '../dto/loginDto';
import * as userService from '../services/userService';

// POST /users/register
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

// POST /users/login
export const login: RequestHandler = async (req, res) => {
  const result = await userService.login(req.body as LoginInput);

  if (!result.ok) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    return;
  }

  const token = jwt.sign({ roles: result.roles }, jwtPrivateKey, {
    algorithm: 'RS256',
    subject: result.userId,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    jwtid: randomUUID(),
  });

  res.status(200).json({ token });
};

// GET /users/me
export const getMe: RequestHandler = async (req, res) => {
  const user = await userService.getProfileById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Not Found', message: 'User no longer exists.' });
    return;
  }
  res.status(200).json({ user });
};

// GET /users
export const listUsers: RequestHandler = async (_req, res) => {
  const users = await userService.listProfiles();
  res.status(200).json({ users });
};

// GET /users/:id — view a specific user's profile (ADMINISTRATOR only)
export const getUserById: RequestHandler = async (req, res) => {
  const id = String(req.params.id); // single route param is always a string at runtime
  const user = await userService.getProfileById(id);
  if (!user) {
    res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    return;
  }
  res.status(200).json({ user });
};
