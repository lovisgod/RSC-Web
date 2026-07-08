import tailwindcss from "@tailwindcss/vite";
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
    plugins: [tailwindcss(), react()],
    server: {
      host: "0.0.0.0",
      allowedHosts: ["outlet.localhost"],
      port: 5175,
      strictPort: true,
      fs: {
        allow: [searchForWorkspaceRoot(process.cwd())],
      },
      ...(proxy ? { proxy } : {}),
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: ["outlet.localhost"],
      port: 4175,
      strictPort: true,
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
