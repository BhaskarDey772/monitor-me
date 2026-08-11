import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";
import { ENV_FILE, resolveSqliteUrl } from "./src/config/paths.ts";

// Prisma 7 no longer auto-loads .env; point it at the shared root file.
loadEnv({ path: ENV_FILE, quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolveSqliteUrl(process.env["DATABASE_URL"]),
  },
});
