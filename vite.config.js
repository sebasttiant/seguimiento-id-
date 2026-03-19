import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
