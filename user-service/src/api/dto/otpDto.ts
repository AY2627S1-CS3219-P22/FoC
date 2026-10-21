// Validates OTP request/verify bodies. userId comes from the JWT, not the body.
//AI declaration: From coderabbit comments more cleanly separate otpRequestSchema, challengeId representation, and request input
import { z } from 'zod';

const challengeId = z.string().min(1).max(128);

export const otpRequestSchema = z.object({
  challengeId,
});

export const otpStringSchema = z.object({
  otp: z
    .string()
    .length(6, { message: 'OTP must be exactly 6 digits' })
    .regex(/^\d+$/, { message: 'OTP must contain only numbers' }),
  challengeId,
});

export type OtpVerifyBody = z.infer<typeof otpStringSchema>;
export type OtpRequestBody = z.infer<typeof otpRequestSchema>;
export type otpRequestInput = { userId: string; challengeId: string };
