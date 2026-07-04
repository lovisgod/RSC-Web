import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["outlet.localhost"],
    port: 5175,
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
    proxy: {
      "/api": {
        target: "https://api-dev.rscdev.tech",
        changeOrigin: true,
        cookieDomainRewrite: { "*": "" },
      },
    },
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
});
