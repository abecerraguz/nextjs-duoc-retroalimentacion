import { PrismaClient } from "../generated/prisma/client/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis

const createAdapter = () =>
  new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
