// Convenience re-exports for the module-level singleton.
// Use initApiClient(baseUrl) at your app entry point, then call
// getApiClient() anywhere in the codebase without prop-drilling.
export { getApiClient, initApiClient } from "../index";
