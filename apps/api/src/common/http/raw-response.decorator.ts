import { SetMetadata } from "@nestjs/common";

export const RAW_RESPONSE_METADATA = "RAW_RESPONSE_METADATA";

/**
 * Decorator to bypass standard ApiResponseInterceptor envelope wrapping
 * for endpoints that return raw strings, Prometheus metrics, or file streams.
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_METADATA, true);
