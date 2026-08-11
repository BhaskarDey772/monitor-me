import { createApp, port } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const server = createApp().listen(port, () => {
  console.log(`[api] listening on ${env.SERVER_URL} (${env.NODE_ENV})`);
  console.log(`[api] allowed origins: ${env.CLIENT_URL.join(", ")}`);
});

const shutdown = async (signal: string) => {
  console.log(`[api] ${signal} received, shutting down`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
