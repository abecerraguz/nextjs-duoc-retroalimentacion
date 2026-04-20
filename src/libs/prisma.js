import { PrismaClient } from "../generated/prisma/client/client"
import { PrismaPg } from "@prisma/adapter-pg"

// Railway usa certificados auto-firmados en su proxy postgres.
// Esta línea deshabilita la validación TLS a nivel del proceso Node.js.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const globalForPrisma = globalThis

const createAdapter = () =>
  new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
