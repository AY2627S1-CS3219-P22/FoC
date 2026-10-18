//validates the otp the user types in UI
import {z} from 'zod'; 

export const otpStringSchema = z
  .string()
  .length(6, { message: "OTP must be exactly 6 digits" })
  .regex(/^\d+$/, { message: "OTP must contain only numbers" });

export type otp = z.infer<typeof otpStringSchema>;
