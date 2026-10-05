import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/client.js'

const adapter = new PrismaMariaDb({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'db_leave_management',
  connectionLimit: 5,
  acquireTimeout: 30000,
  connectTimeout: 5000,
})

const prisma = new PrismaClient({
  adapter,
})

export default prisma