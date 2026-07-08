import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, searchForWorkspaceRoot } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_BASE_URL;
  const proxy = apiProxyTarget
    ? {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          // Rewrite cookie domain so the browser accepts them on admin.localhost.
          cookieDomainRewrite: { "*": "" },
        },
        "/socket.io": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          cookieDomainRewrite: { "*": "" },
        },
      }
    : undefined;

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      allowedHosts: ["admin.localhost"],
      port: 5173,
      strictPort: true,
      fs: {
        allow: [searchForWorkspaceRoot(process.cwd())],
      },
      ...(proxy ? { proxy } : {}),
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: ["admin.localhost"],
      port: 4173,
      strictPort: true,
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
