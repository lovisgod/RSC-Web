import { ApiError, SERVER_ERROR_MESSAGE } from "@rsc/api-client";

export function getMutationErrorMessage(
  error: unknown,
  statusMessages: Partial<Record<number, string>> = {},
): string {
  if (error instanceof TypeError) {
    return "Cannot reach the server. Please check your connection and try again.";
  }

  if (error instanceof ApiError) {
    if (error.status >= 500) return SERVER_ERROR_MESSAGE;
    return statusMessages[error.status] ?? error.message;
  }

  return "Something went wrong. Please try again.";
}
