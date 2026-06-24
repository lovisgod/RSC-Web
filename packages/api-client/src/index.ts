import {
  adminOverviewSchema,
  apiErrorResponseSchema,
  apiResponseSchema,
  outletSummarySchema,
  phoneVerificationResultSchema,
  registerCustomerInputSchema,
  registrationResultSchema,
  verifyPhoneInputSchema,
  type AdminOverview,
  type OutletSummary,
  type PhoneVerificationResult,
  type RegisterCustomerInput,
  type RegistrationResult,
  type VerifyPhoneInput,
} from "@rsc/contracts";
import type { AxiosInstance } from "axios";
import { z } from "zod";

import { createHttpClient } from "./http";

export { ApiError } from "./errors";
export type { HttpClientOptions as ApiClientOptions } from "./http";

async function request<T>(http: AxiosInstance, path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await http.get<unknown>(path);
  return schema.parse(response.data);
}

export function createApiClient(options: {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null> | string | null;
}) {
  const http = createHttpClient(options);

  return {
    registerCustomer(input: RegisterCustomerInput): Promise<RegistrationResult> {
      const body = registerCustomerInputSchema.parse(input);

      return request("/api/v1/auth/register", registrationResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    verifyPhone(input: VerifyPhoneInput): Promise<PhoneVerificationResult> {
      const body = verifyPhoneInputSchema.parse(input);

      return request("/api/v1/auth/verify-phone", phoneVerificationResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    listOutlets(): Promise<OutletSummary[]> {
      return request(http, "/api/v1/outlets", z.array(outletSummarySchema));
    },
    getAdminOverview(): Promise<AdminOverview> {
      return request(http, "/api/v1/admin/overview", adminOverviewSchema);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

// Module-level singleton — call initApiClient once at your app entry point,
// then use getApiClient() anywhere without passing the client as a parameter.
let _client: ApiClient | null = null;

export function initApiClient(
  baseUrl: string,
  getAccessToken?: () => Promise<string | null> | string | null,
): ApiClient {
  _client = createApiClient({
    baseUrl,
    ...(getAccessToken && { getAccessToken }),
  });
  return _client;
}

export function getApiClient(): ApiClient {
  if (!_client) {
    throw new Error("[api-client] Client not initialized. Call initApiClient(baseUrl) before use.");
  }
  return _client;
}
