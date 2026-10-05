import 'dotenv/config'
import bcrypt from 'bcrypt'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../src/generated/prisma/client.js'

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

async function main() {
  console.log('🔌 Mengecek koneksi database...')

  await prisma.$queryRaw`SELECT 1`

  console.log('✅ Koneksi database berhasil')

  const password = 'owner12345'
  const passwordHash = await bcrypt.hash(password, 12)

  console.log('🔐 Membuat akun Owner...')

  const existingOwner = await prisma.user.findUnique({
    where: {
      username: 'owner',
    },
  })

  let owner

  if (existingOwner) {
    owner = await prisma.user.update({
      where: {
        username: 'owner',
      },
      data: {
        name: 'Owner',
        passwordHash,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    })
  } else {
    owner = await prisma.user.create({
      data: {
        name: 'Owner',
        username: 'owner',
        passwordHash,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    })
  }

  console.log('✅ Owner berhasil dibuat')
  console.log(`Username: ${owner.username}`)
  console.log(`Password: ${password}`)
}

main()
  .catch((error) => {
    console.error('❌ Seed gagal')
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })