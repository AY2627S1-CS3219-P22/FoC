import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env, jwtPrivateKey } from '../../env';
import type { RegisterInput } from '../dto/registerDto';
import type { LoginInput } from '../dto/loginDto';
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

// POST /users/login — verify credentials, return a signed JWT (F2.1).
export const login: RequestHandler = async (req, res) => {
  const result = await userService.login(req.body as LoginInput);

  if (!result.ok) {
    // Generic message — never reveal whether the email or the password was wrong.
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    return;
  }

  // RS256-signed access token. `sub` (user id) + `roles` are the cross-service
  // claim contract other services verify (see DECISIONS.md D8). `jti` is the
  // forward-compat hook for revoking tokens on logout later.
  const token = jwt.sign({ roles: result.roles }, jwtPrivateKey, {
    algorithm: 'RS256',
    subject: result.userId,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    jwtid: randomUUID(),
  });

  res.status(200).json({ token });
};

// GET /users/me — the authenticated caller's own profile (F2.3). req.user is
// guaranteed by the `authenticate` middleware applied to this route.
export const getMe: RequestHandler = async (req, res) => {
  const user = await userService.getProfileById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Not Found', message: 'User no longer exists.' });
    return;
  }
  res.status(200).json({ user });
};

// GET /users — list all users. ADMINISTRATOR-only (enforced by requireRole on the
// route); demonstrates RBAC — a normal USER gets 403 here.
export const listUsers: RequestHandler = async (_req, res) => {
  const users = await userService.listProfiles();
  res.status(200).json({ users });
};
