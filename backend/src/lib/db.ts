import 'dotenv/config'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/client.js'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL belum dikonfigurasi di file .env.',
  )
}

const databaseUrlObject = new URL(databaseUrl)

const adapter = new PrismaMariaDb({
  host: databaseUrlObject.hostname,
  port: Number(databaseUrlObject.port || 3306),
  user: decodeURIComponent(
    databaseUrlObject.username,
  ),
  password: decodeURIComponent(
    databaseUrlObject.password,
  ),
  database: databaseUrlObject.pathname.replace(
    /^\//,
    '',
  ),
  connectionLimit: 5,
  acquireTimeout: 30000,
  connectTimeout: 5000,
})

const prisma = new PrismaClient({
  adapter,
})

export default prisma