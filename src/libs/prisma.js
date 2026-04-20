import { PrismaClient } from "../generated/prisma/client/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const globalForPrisma = globalThis

const createAdapter = () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  return new PrismaPg(pool)
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
