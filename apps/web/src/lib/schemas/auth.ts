import { z } from "zod";
import { nigerianPhoneNumberSchema } from "@rsc/contracts";

const emailOrPhoneIdentifierSchema = z
  .string()
  .trim()
  .min(1, "Email or phone number is required")
  .refine(
    (value) =>
      z.string().email().safeParse(value).success ||
      nigerianPhoneNumberSchema.safeParse(value).success,
    "Enter a valid email address or Nigerian phone number",
  );

export const signInSchema = z.object({
  identifier: emailOrPhoneIdentifierSchema,
  password: z.string().min(1, "Password is required"),
});

const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
// Uncomment below to enforce strong password rules:
// const passwordSchema = z
//   .string()
//   .min(8, "Password must be at least 8 characters")
//   .regex(/[A-Z]/, "Password must include at least one uppercase letter")
//   .regex(/[0-9]/, "Password must include at least one number")
//   .regex(/[^A-Za-z0-9]/, "Password must include at least one symbol");

export const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: nigerianPhoneNumberSchema,
  email: z.string().email("Enter a valid email address"),
  password: passwordSchema,
});

export const otpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});

export const forgotPasswordSchema = z.object({
  identifier: emailOrPhoneIdentifierSchema,
});

export const resetPasswordSchema = z
  .object({
    code: z.string().length(6, "Enter the 6-digit reset code"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type OtpFormData = z.infer<typeof otpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
