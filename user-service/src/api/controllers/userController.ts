import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env, jwtPrivateKey } from '../../env';
import type { RegisterInput } from '../dto/registerDto';
import type { LoginInput } from '../dto/loginDto';
import * as userService from '../services/userService';
import * as otpService from '../services/otpService';

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

//POST /users/otp/request - post a request for OTP generation
//TODO: Add in error handling for too many attempts rejection
//TODO: Add in error handling for invalidated OTP
export const sendOTPRequest: RequestHandler = async(req, res) => {
    const id = String(req.params.id) ;
    const challengeId = String(req.body.challengeId);

    try{
      const user = await userService.getProfileById(id);

      if(!user) {
        res.status(404).json({error: 'Not Found', message: 'User not found.'});
        return;
      }

      await otpService.sendOTPRequest(user.email, challengeId);
      res.status(200).json({ message: `OTP sent to ${user.email}` });
  } catch {
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to send OTP.' });
  }
};

//POST /users/otp/verify - verify/validate OTP is correct
export const verifyOTP: RequestHandler = async(req, res) => {
  const id = String(req.params.id);
  const challengeId = req.body.challengeId;
  const otp = req.body.otp;

  try {

    const user = await userService.getProfileById(id);

      if(!user) {
        res.status(404).json({error: 'Not Found', message: 'User not found.'});
        return;
      }
      
      const isVerified = await otpService.verifyOTP(id, challengeId, otp); //throws an error based
      
      if (isVerified == false) {
        res.status(400).json({error: "400: Not verified", message: "Bad Request. Invalid OTP"})
        return
      } 
      if (isVerified == true) {
        res.status(200).json({message: 'OTP valid for login'});
        return
      }
  }

  catch(err) {

    return 0;

  }
}