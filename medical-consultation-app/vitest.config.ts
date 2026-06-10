import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    pool: "forks",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // WHY: threshold set at current baseline to prevent regression; raise incrementally as coverage improves
      thresholds: {
        statements: 35,
        branches: 24,
        functions: 38,
        lines: 37,
      },
      exclude: [
        "node_modules/**",
        "**/__tests__/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        ".next/**",
        "next.config*",
        "tailwind.config*",
        "postcss.config*",
      ],
    },
  },
})
