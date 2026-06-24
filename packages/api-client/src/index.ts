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
import { z } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  getAccessToken?: () => Promise<string | null> | string | null;
}

export function createApiClient(options: ApiClientOptions) {
  const requestFetch = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await options.getAccessToken?.();
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");

    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const response = await requestFetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const errorPayload: unknown = await response.json().catch(() => null);
      const parsedError = apiErrorResponseSchema.safeParse(errorPayload);

      throw new ApiError(
        parsedError.success
          ? parsedError.data.message
          : `API request failed with status ${response.status}`,
        response.status,
        response.headers.get("x-request-id"),
      );
    }

    const envelope = apiResponseSchema(schema).parse(await response.json());

    return envelope.data;
  }

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
      return request("/api/v1/outlets", z.array(outletSummarySchema));
    },
    getAdminOverview(): Promise<AdminOverview> {
      return request("/api/v1/admin/overview", adminOverviewSchema);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
