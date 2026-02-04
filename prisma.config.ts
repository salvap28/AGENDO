import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const rawUrl = process.env.DATABASE_URL ?? "file:./apps/api/prisma/dev.db";
const databaseUrl = normalizeSqliteUrl(rawUrl);

export default defineConfig({
  schema: "apps/api/prisma/schema.prisma",
  migrations: {
    path: "apps/api/prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});

function normalizeSqliteUrl(url: string) {
  if (!url.startsWith("file:")) return url;
  const filePath = url.slice(5);
  if (path.isAbsolute(filePath)) return url;
  const absolute = path.resolve(process.cwd(), filePath);
  return `file:${absolute}`;
}
