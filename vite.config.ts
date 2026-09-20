import { defineConfig } from "vite";
export default defineConfig({
  server: { strictPort: true, proxy: { "/api": "http://127.0.0.1:4317" } },
  build: {
    target: "es2022",
    rollupOptions: { output: { manualChunks: { three: ["three"] } } },
  },
});
