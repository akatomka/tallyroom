import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
});
