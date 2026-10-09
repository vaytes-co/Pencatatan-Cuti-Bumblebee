import 'dotenv/config'

import bcrypt from 'bcrypt'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'

import {
  PrismaClient,
} from '../src/generated/prisma/client.js'

import {
  PERMISSIONS,
  PLATFORM_PERMISSIONS,
} from '../src/config/permissions.js'

// =========================================================
// DATABASE
// =========================================================

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL belum dikonfigurasi di file .env',
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

// =========================================================
// DEFAULT COMPANY ROLES
// =========================================================

const DEFAULT_ROLES = [
  {
    name: 'Owner',
    description:
      'Pemilik perusahaan dengan akses tertinggi.',
    level: 1000,
    isSystemRole: true,

    permissions: PERMISSIONS.map(
      (permission) => permission.key,
    ),
  },

  {
    name: 'HRD',
    description:
      'Mengelola kebutuhan HR dan data karyawan.',
    level: 500,
    isSystemRole: true,

    permissions: [
      'dashboard.read',

      'employees.read',
      'employees.create',
      'employees.update',

      'leave.read',
      'leave.create',
      'leave.update',
      'leave.approve_management',

      'users.read',
    ],
  },

  {
    name: 'BM',
    description:
      'Business Manager dengan akses operasional yang diperlukan.',
    level: 400,
    isSystemRole: true,

    permissions: [
      'dashboard.read',

      'employees.read',

      'leave.read',
      'leave.create',
      'leave.approve_management',

      'users.read',
    ],
  },

  {
    name: 'Admin',
    description:
      'Administrator operasional perusahaan.',
    level: 300,
    isSystemRole: true,

    permissions: [
      'dashboard.read',
    ],
  },

  {
    name: 'Karyawan',
    description:
      'Pengguna biasa untuk kebutuhan self-service.',
    level: 100,
    isSystemRole: true,

    permissions: [
      'dashboard.read',
      'leave.read',
    ],
  },
] as const

// =========================================================
// DEFAULT PLATFORM ROLES
// =========================================================

const DEFAULT_PLATFORM_ROLES = [
  {
    name: 'Platform Owner',
    description:
      'Pemilik dan pengelola utama seluruh platform.',
    level: 1000,
    isSystemRole: true,

    permissions: PLATFORM_PERMISSIONS.map(
      (permission) => permission.key,
    ),
  },
] as const

// =========================================================
// DEFAULT MODULES
// =========================================================

const DEFAULT_MODULES = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    description:
      'Dashboard utama perusahaan.',
    isSystemModule: true,
  },

  {
    key: 'employees',
    name: 'Employees',
    description:
      'Manajemen data karyawan.',
    isSystemModule: true,
  },

  {
    key: 'leave',
    name: 'Leave',
    description:
      'Manajemen cuti dan izin.',
    isSystemModule: true,
  },

  {
    key: 'attendance',
    name: 'Attendance',
    description:
      'Manajemen kehadiran karyawan.',
    isSystemModule: true,
  },

  {
    key: 'overtime',
    name: 'Overtime',
    description:
      'Manajemen lembur.',
    isSystemModule: true,
  },

  {
    key: 'performance',
    name: 'Performance',
    description:
      'Manajemen penilaian kinerja.',
    isSystemModule: true,
  },

  {
    key: 'payroll',
    name: 'Payroll',
    description:
      'Manajemen penggajian.',
    isSystemModule: true,
  },

  {
    key: 'documents',
    name: 'Documents',
    description:
      'Manajemen dokumen HR.',
    isSystemModule: true,
  },

  {
    key: 'reports',
    name: 'Reports',
    description:
      'Laporan dan analitik HR.',
    isSystemModule: true,
  },
] as const

// =========================================================
// ACTIVE MODULES FOR DEFAULT COMPANY
// =========================================================

const ACTIVE_MODULES = [
  'dashboard',
  'employees',
  'leave',
] as const

// =========================================================
// MAIN
// =========================================================

async function main() {
  console.log('')
  console.log('========================================')
  console.log('🚀 HR MANAGEMENT PLATFORM - DATABASE SEED')
  console.log('========================================')
  console.log('')

  // =======================================================
  // CONNECTION
  // =======================================================

  console.log('🔌 Mengecek koneksi database...')

  await prisma.$queryRaw`SELECT 1`

  console.log('✅ Koneksi database berhasil')
  console.log('')

  // =======================================================
  // COMPANY
  // =======================================================

  console.log('🏢 Menyiapkan company...')

  const company = await prisma.company.upsert({
    where: {
      code: 'DEFAULT',
    },

    update: {
      name: 'Existing Company',
      timezone: 'Asia/Jakarta',
      status: 'ACTIVE',
    },

    create: {
      code: 'DEFAULT',
      name: 'Existing Company',
      timezone: 'Asia/Jakarta',
      status: 'ACTIVE',
    },
  })

  console.log(
    `✅ Company: ${company.name}`,
  )

  console.log(
    `   ID: ${company.id}`,
  )

  console.log('')

  // =======================================================
  // PERMISSIONS
  // =======================================================

  console.log('🔐 Menyiapkan permission catalog...')

  const permissionMap = new Map<
    string,
    number
  >()

  const ALL_PERMISSIONS = [
    ...PERMISSIONS,
    ...PLATFORM_PERMISSIONS,
  ] as const

  for (const permission of ALL_PERMISSIONS) {
    const result =
      await prisma.permission.upsert({
        where: {
          key: permission.key,
        },

        update: {
          name: permission.name,
          description: permission.description,
          module: permission.module,
          action: permission.action,
        },

        create: {
          key: permission.key,
          name: permission.name,
          description: permission.description,
          module: permission.module,
          action: permission.action,
        },
      })

    permissionMap.set(
      result.key,
      result.id,
    )
  }

  console.log(
    `✅ ${ALL_PERMISSIONS.length} permission tersedia`,
  )

  console.log('')

  // =======================================================
  // MODULES
  // =======================================================

  console.log('🧩 Menyiapkan module catalog...')

  const moduleMap = new Map<
    string,
    number
  >()

  for (const module of DEFAULT_MODULES) {
    const result =
      await prisma.module.upsert({
        where: {
          key: module.key,
        },

        update: {
          name: module.name,
          description: module.description,
          isSystemModule:
            module.isSystemModule,
        },

        create: {
          key: module.key,
          name: module.name,
          description: module.description,
          isSystemModule:
            module.isSystemModule,
        },
      })

    moduleMap.set(
      result.key,
      result.id,
    )
  }

  console.log(
    `✅ ${DEFAULT_MODULES.length} module tersedia`,
  )

  console.log('')

  // =======================================================
  // COMPANY MODULES
  // =======================================================

  console.log(
    '⚙️ Mengatur module untuk company...',
  )

  for (const module of DEFAULT_MODULES) {
    const moduleId =
      moduleMap.get(module.key)

    if (!moduleId) {
      throw new Error(
        `Module "${module.key}" tidak ditemukan.`,
      )
    }

    const isActive =
      ACTIVE_MODULES.includes(
        module.key as
          (typeof ACTIVE_MODULES)[number],
      )

    await prisma.companyModule.upsert({
      where: {
        companyId_moduleId: {
          companyId: company.id,
          moduleId,
        },
      },

      update: {
        status: isActive
          ? 'ACTIVE'
          : 'INACTIVE',
      },

      create: {
        companyId: company.id,
        moduleId,
        status: isActive
          ? 'ACTIVE'
          : 'INACTIVE',
        activatedAt: isActive
          ? new Date()
          : null,
      },
    })

    console.log(
      `   ✓ ${module.name}: ${
        isActive
          ? 'ACTIVE'
          : 'INACTIVE'
      }`,
    )
  }

  console.log('')

  // =======================================================
  // COMPANY ROLES
  // =======================================================

  console.log(
    '👥 Menyiapkan default roles...',
  )

  const roleMap = new Map<
    string,
    number
  >()

  for (const role of DEFAULT_ROLES) {
    const result =
      await prisma.role.upsert({
        where: {
          companyId_name: {
            companyId: company.id,
            name: role.name,
          },
        },

        update: {
          description: role.description,
          level: role.level,
          isSystemRole:
            role.isSystemRole,
        },

        create: {
          companyId: company.id,
          name: role.name,
          description: role.description,
          level: role.level,
          isSystemRole:
            role.isSystemRole,
        },
      })

    roleMap.set(
      result.name,
      result.id,
    )

    console.log(
      `   ✓ ${role.name}`,
    )
  }

  console.log('')

  // =======================================================
  // COMPANY ROLE PERMISSIONS
  // =======================================================

  console.log(
    '🔗 Menyiapkan role permissions...',
  )

  for (const role of DEFAULT_ROLES) {
    const roleId =
      roleMap.get(role.name)

    if (!roleId) {
      throw new Error(
        `Role "${role.name}" tidak ditemukan.`,
      )
    }

    for (const permissionKey of role.permissions) {
      const permissionId =
        permissionMap.get(
          permissionKey,
        )

      if (!permissionId) {
        throw new Error(
          `Permission "${permissionKey}" belum terdaftar.`,
        )
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },

        update: {},

        create: {
          roleId,
          permissionId,
        },
      })
    }

    console.log(
      `   ✓ ${role.name}: ${role.permissions.length} permission`,
    )
  }

  console.log('')

  // =======================================================
// SYNC SYSTEM ROLE PERMISSIONS FOR ALL COMPANIES
// =======================================================
//
// Permission baru harus ikut masuk ke system role pada
// company yang sudah ada sebelumnya.
//
// Contoh:
// - Company DEFAULT
// - Company TEST-BLC
// - Company TEST-AUDIT-01
// - company lain yang dibuat nanti
//
// Kita hanya MENAMBAHKAN permission yang belum ada.
// Permission lama tidak dihapus agar seed aman dijalankan
// berulang kali.
// =======================================================

console.log(
  '🔄 Sinkronisasi permission system role seluruh company...',
)

const allCompanies =
  await prisma.company.findMany({
    select: {
      id: true,
      name: true,
    },
  })

for (const existingCompany of allCompanies) {
  for (const defaultRole of DEFAULT_ROLES) {
    const systemRole =
      await prisma.role.findFirst({
        where: {
          companyId:
            existingCompany.id,

          name:
            defaultRole.name,

          isSystemRole: true,
        },

        select: {
          id: true,
          name: true,
        },
      })

    // Kalau company tersebut belum mempunyai
    // system role tertentu, jangan membuat role
    // secara diam-diam di sini.
    //
    // Role system seharusnya dibuat melalui
    // company creation flow.
    if (!systemRole) {
      continue
    }

    let addedPermissionCount = 0

    for (
      const permissionKey of
        defaultRole.permissions
    ) {
      const permissionId =
        permissionMap.get(
          permissionKey,
        )

      if (!permissionId) {
        throw new Error(
          `Permission "${permissionKey}" belum terdaftar.`,
        )
      }

      const existingRolePermission =
        await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId:
                systemRole.id,

              permissionId,
            },
          },
        })

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            roleId:
              systemRole.id,

            permissionId,
          },
        })

        addedPermissionCount++
      }
    }

    console.log(
      `   ✓ ${existingCompany.name} → ${systemRole.name}: +${addedPermissionCount} permission`,
    )
  }
}

console.log('')

  // =======================================================
  // PLATFORM ROLES
  // =======================================================

  console.log(
    '🛡️ Menyiapkan platform roles...',
  )

  const platformRoleMap = new Map<
    string,
    number
  >()

  for (const role of DEFAULT_PLATFORM_ROLES) {
    const result =
      await prisma.platformRole.upsert({
        where: {
          name: role.name,
        },

        update: {
          description: role.description,
          level: role.level,
          isSystemRole:
            role.isSystemRole,
        },

        create: {
          name: role.name,
          description: role.description,
          level: role.level,
          isSystemRole:
            role.isSystemRole,
        },
      })

    platformRoleMap.set(
      result.name,
      result.id,
    )

    console.log(
      `   ✓ ${role.name}`,
    )
  }

  console.log('')

  // =======================================================
  // PLATFORM ROLE PERMISSIONS
  // =======================================================

  console.log(
    '🔗 Menyiapkan platform role permissions...',
  )

  for (const role of DEFAULT_PLATFORM_ROLES) {
    const roleId =
      platformRoleMap.get(role.name)

    if (!roleId) {
      throw new Error(
        `Platform role "${role.name}" tidak ditemukan.`,
      )
    }

    for (const permissionKey of role.permissions) {
      const permissionId =
        permissionMap.get(
          permissionKey,
        )

      if (!permissionId) {
        throw new Error(
          `Platform permission "${permissionKey}" belum terdaftar.`,
        )
      }

      await prisma.platformRolePermission.upsert({
        where: {
          platformRoleId_permissionId: {
            platformRoleId: roleId,
            permissionId,
          },
        },

        update: {},

        create: {
          platformRoleId: roleId,
          permissionId,
        },
      })
    }

    console.log(
      `   ✓ ${role.name}: ${role.permissions.length} permission`,
    )
  }

  console.log('')

  // =======================================================
  // PLATFORM OWNER ACCOUNT
  // =======================================================

  console.log(
    '👑 Menyiapkan Platform Owner...',
  )

  const platformOwnerPassword =
    'platform12345'

  const platformOwnerPasswordHash =
    await bcrypt.hash(
      platformOwnerPassword,
      12,
    )

  const platformOwnerRoleId =
    platformRoleMap.get(
      'Platform Owner',
    )

  if (!platformOwnerRoleId) {
    throw new Error(
      'Platform Owner role tidak ditemukan.',
    )
  }

  const existingPlatformOwner =
    await prisma.platformUser.findUnique({
      where: {
        username: 'platform-admin',
      },
    })

  let platformOwner

  if (existingPlatformOwner) {
    platformOwner =
      await prisma.platformUser.update({
        where: {
          username: 'platform-admin',
        },

        data: {
          name: 'Platform Owner',
          passwordHash:
            platformOwnerPasswordHash,
          status: 'ACTIVE',
        },
      })
  } else {
    platformOwner =
      await prisma.platformUser.create({
        data: {
          name: 'Platform Owner',
          username: 'platform-admin',
          passwordHash:
            platformOwnerPasswordHash,
          status: 'ACTIVE',
        },
      })
  }

  await prisma.platformUserRole.upsert({
    where: {
      platformUserId_platformRoleId: {
        platformUserId:
          platformOwner.id,
        platformRoleId:
          platformOwnerRoleId,
      },
    },

    update: {},

    create: {
      platformUserId:
        platformOwner.id,
      platformRoleId:
        platformOwnerRoleId,
    },
  })

  console.log(
    '✅ Platform Owner berhasil disiapkan',
  )

  console.log(
    `   Username: ${platformOwner.username}`,
  )

  console.log(
    `   Password: ${platformOwnerPassword}`,
  )

  console.log('')

  // =======================================================
  // COMPANY OWNER ACCOUNT
  // =======================================================

  console.log(
    '👑 Menyiapkan akun Owner...',
  )

  const password =
    'owner12345'

  const passwordHash =
    await bcrypt.hash(
      password,
      12,
    )

  const ownerRoleId =
    roleMap.get('Owner')

  if (!ownerRoleId) {
    throw new Error(
      'Role Owner tidak ditemukan.',
    )
  }

  const existingOwner =
    await prisma.user.findUnique({
      where: {
        username: 'owner',
      },
    })

  let owner

  if (existingOwner) {
    owner =
      await prisma.user.update({
        where: {
          username: 'owner',
        },

        data: {
          companyId: company.id,
          name: 'Owner',
          passwordHash,
          status: 'ACTIVE',
        },
      })
  } else {
    owner =
      await prisma.user.create({
        data: {
          companyId: company.id,
          name: 'Owner',
          username: 'owner',
          passwordHash,
          status: 'ACTIVE',
        },
      })
  }

  // =======================================================
  // OWNER ROLE
  // =======================================================

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: owner.id,
        roleId: ownerRoleId,
      },
    },

    update: {},

    create: {
      userId: owner.id,
      roleId: ownerRoleId,
    },
  })

  // =======================================================
  // COMPANY OWNER
  // =======================================================

  await prisma.company.update({
    where: {
      id: company.id,
    },

    data: {
      ownerUserId: owner.id,
    },
  })

  console.log(
    '✅ Owner berhasil disiapkan',
  )

  console.log(
    `   Username: ${owner.username}`,
  )

  console.log(
    `   Password: ${password}`,
  )

  console.log('')

  // =======================================================
  // SUMMARY
  // =======================================================

  console.log(
    '========================================',
  )

  console.log(
    '🎉 SEED BERHASIL',
  )

  console.log(
    '========================================',
  )

  console.log(
    `Company          : ${company.name}`,
  )

  console.log(
    `Permissions      : ${ALL_PERMISSIONS.length}`,
  )

  console.log(
    `Company Roles    : ${DEFAULT_ROLES.length}`,
  )

  console.log(
    `Platform Roles   : ${DEFAULT_PLATFORM_ROLES.length}`,
  )

  console.log(
    `Modules          : ${DEFAULT_MODULES.length}`,
  )

  console.log(
    `Owner            : ${owner.username}`,
  )

  console.log(
    `Platform Owner   : ${platformOwner.username}`,
  )

  console.log(
    '========================================',
  )

  console.log('')
}

// =========================================================
// ERROR HANDLING
// =========================================================

main()
  .catch((error) => {
    console.error('')
    console.error('❌ Seed gagal')
    console.error(error)

    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })