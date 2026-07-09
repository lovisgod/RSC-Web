import { z } from "zod";
import { NIGERIAN_MOBILE_NUMBER_PATTERN } from "@rsc/contracts";

export const nigerianPhoneSchema = z
  .string()
  .trim()
  .regex(
    NIGERIAN_MOBILE_NUMBER_PATTERN,
    "Enter a valid Nigerian number (e.g. 08032000102 or +2348032000102)",
  );

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: nigerianPhoneSchema,
});

export type ProfileFormData = z.infer<typeof profileSchema>;
