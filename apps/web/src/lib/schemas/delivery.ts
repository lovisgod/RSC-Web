import { z } from "zod";

export const deliveryAddressSchema = z.object({
  label: z.string().min(1, "Label is required").max(50),
  addressLine: z.string().min(3, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
});

export type DeliveryAddressFormData = z.infer<typeof deliveryAddressSchema>;
