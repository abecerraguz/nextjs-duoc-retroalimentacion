import { PrismaClient } from "../generated/prisma/client/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const globalForPrisma = globalThis

const createAdapter = () => {
  // En Railway el servidor Postgres interno no tiene certificado TLS válido.
  // RAILWAY_ENVIRONMENT_NAME es inyectada automáticamente por Railway en producción.
  const isRailway = !!process.env.RAILWAY_ENVIRONMENT_NAME || !!process.env.RAILWAY_SERVICE_ID
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isRailway ? false : { rejectUnauthorized: false },
  })
  return new PrismaPg(pool)
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
