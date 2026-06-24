// packages/contracts/src/auth.ts
import { z } from "zod";

// 1. Rulebook for signing up a fresh account
export const RegisterInputSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z
    .string()
    .regex(/^(?:\+234|0)[789][01]\d{8}$/, "Enter a valid Nigerian phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// 2. Rulebook for verifying the phone via SMS OTP
export const VerifyPhoneInputSchema = z.object({
  phoneNumber: z.string().regex(/^(?:\0)[789][01]\d{8}$/, "Invalid phone number reference"),
  otpCode: z.string().length(6, "The verification code must be exactly 6 digits"),
});

// 3. Rulebook for logging in (matching your uploaded screen image)
export const LoginInputSchema = z.object({
  identifier: z.string().min(1, "Please enter your email or phone number"),
  password: z.string().min(8, "Password is required"),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type VerifyPhoneInput = z.infer<typeof VerifyPhoneInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
