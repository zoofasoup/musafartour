import { defineConfig } from "vitest/config";
import path from "path";

// Unit and database tests only (no browser). The app's own vite config is left alone.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { environment: "node", include: ["src/**/*.test.ts", "tests/**/*.test.ts"], testTimeout: 30000 },
});
