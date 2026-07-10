import { z } from "zod";
import { nigerianPhoneNumberSchema } from "@rsc/contracts";

export const nigerianPhoneSchema = nigerianPhoneNumberSchema;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: nigerianPhoneSchema,
});

export type ProfileFormData = z.infer<typeof profileSchema>;
