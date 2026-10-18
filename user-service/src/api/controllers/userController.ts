import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env, jwtPrivateKey } from '../../env';
import type { RegisterInput } from '../dto/registerDto';
import type { LoginInput } from '../dto/loginDto';
import * as userService from '../services/userService';
import * as otpService from '../services/otpService';
import { otpStringSchema } from '../dto/otpDto';

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

// GET /users/:id
export const getUserById: RequestHandler = async (req, res) => {
  const id = String(req.params.id);
  const user = await userService.getProfileById(id);
  if (!user) {
    res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    return;
  }
  res.status(200).json({ user });
};

// POST /users/:id/otp/request 
// AI declaration
export const sendOTPRequest: RequestHandler = async (req, res) => {
  const id = String(req.params.id);
  const challengeId = String(req.body.challengeId);

  try {
    const user = await userService.getProfileById(id);
    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User not found.' });
      return;
    }

    const result = await otpService.sendOTPRequest({userId: user.id, email: user.email,challengeId,});

    if (!result.ok) {
      if (result.retryAfterSeconds) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
      }
      res.status(429).json({ error: 'Too Many Requests', message: 'Try again after some time.' });
      return;
    }
    res.status(200).json({ message: `OTP sent to ${user.email}` });
    return
  } catch {
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to send OTP.' });
  }
};

// POST /users/:id/otp/verify 
// AI declaration
export const verifyOTP: RequestHandler = async (req, res) => {
  const id = String(req.params.id);
  const parsedOtp = otpStringSchema.safeParse(req.body);

  if ( !parsedOtp.success) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'challengeId and a 6-digit OTP are required.',
    });
    return;
  }

  const {otp, challengeId} = parsedOtp.data; 

  try {
    const user = await userService.getProfileById(id);
    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User not found.' });
      return;
    }

    const result = await otpService.verifyOTP({
      userId: user.id,
      challengeId,
      otp: otp,
    });

    if (!result.ok) {
      if (result.reason === 'locked') {
        res.status(429).json({ error: 'Too Many Requests', message: 'Try again after some time.' });
        return;
      }
      if (result.reason === 'challenge') {
        res.status(400).json({ error: 'Bad Request', message: 'This OTP is no longer valid.' });
        return;
      }
      if (result.reason === 'missing') {
        res.status(400).json({ error: 'Bad Request', message: 'OTP expired or not found.' });
        return;
      }
      res.status(400).json({ error: 'Bad Request', message: 'Invalid OTP.' });
      return;
    }

    res.status(200).json({ message: 'OTP valid for login' });
  } catch {
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to verify OTP.' });
  }
};