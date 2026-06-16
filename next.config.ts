import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "better-sqlite3", "pg", "mysql2"],
};

export default nextConfig;
