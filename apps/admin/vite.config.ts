import react from "@vitejs/plugin-react";
import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["admin.localhost"],
    port: 5173,
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
    proxy: {
      "/api": {
        target: "https://api-dev.rscdev.tech",
        changeOrigin: true,
        // Rewrite cookie domain so the browser accepts them on 127.0.0.1
        cookieDomainRewrite: { "*": "" },
      },
    },
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
});
