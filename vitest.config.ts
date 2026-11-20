import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // The real "server-only" package throws unless a bundler strips it for the server build.
      // Vitest runs plain Node, so swap it for a no-op the same way Next.js does for RSC tests.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
