import { fresh } from "@fresh/plugin-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [fresh()],
  server: {
    fs: {
      // Deno workspace dependencies are installed at the repository root.
      allow: [".."],
    },
  },
});
