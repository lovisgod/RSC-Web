import { ApiError } from "@rsc/api-client";

export function getMutationErrorMessage(
  error: unknown,
  statusMessages: Partial<Record<number, string>> = {},
): string {
  if (error instanceof TypeError) {
    return "Cannot reach the server. Please check your connection and try again.";
  }

  if (error instanceof ApiError) {
    return statusMessages[error.status] ?? "Something went wrong. Please try again.";
  }

  return "Something went wrong. Please try again.";
}
