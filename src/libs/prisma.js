import { PrismaClient } from "../generated/prisma/client/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const globalForPrisma = globalThis

const createAdapter = () => {
  const url = process.env.DATABASE_URL ?? ''
  const isInternal = url.includes('.railway.internal') || url.includes('localhost') || url.includes('127.0.0.1')
  const pool = new pg.Pool({
    connectionString: url,
    ssl: isInternal ? false : { rejectUnauthorized: false },
  })
  return new PrismaPg(pool)
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
