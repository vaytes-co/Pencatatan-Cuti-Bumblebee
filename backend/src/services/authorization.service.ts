import prisma from '../lib/db.js'

export interface AuthorizationContext {
  userId: number
  companyId: number
  permissions: Set<string>
  highestRoleLevel: number
  isOwner: boolean
}

export async function getAuthorizationContext(
  userId: number,
  companyId: number,
): Promise<AuthorizationContext> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      companyId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      companyId: true,
      userRoles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              level: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: {
                      key: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      userPermissions: {
        select: {
          effect: true,
          permission: {
            select: {
              key: true,
            },
          },
        },
      },
    },
  })

  if (!user) {
    throw new Error('User tidak ditemukan atau tidak aktif.')
  }

  const permissions = new Set<string>()
  const deniedPermissions = new Set<string>()

  let highestRoleLevel = 0
  let isOwner = false

  // Mengambil permission dari seluruh role yang dimiliki user.
  for (const userRole of user.userRoles) {
    const role = userRole.role

    highestRoleLevel = Math.max(
      highestRoleLevel,
      role.level,
    )

    if (
      role.name.toLowerCase() === 'owner' ||
      role.level >= 1000
    ) {
      isOwner = true
    }

    for (const rolePermission of role.rolePermissions) {
      permissions.add(rolePermission.permission.key)
    }
  }

  // Permission langsung pada user.
  for (const userPermission of user.userPermissions) {
    const key = userPermission.permission.key

    if (userPermission.effect === 'DENY') {
      deniedPermissions.add(key)
      permissions.delete(key)
      continue
    }

    if (
      userPermission.effect === 'ALLOW' &&
      !deniedPermissions.has(key)
    ) {
      permissions.add(key)
    }
  }

  // Owner mendapatkan seluruh permission yang terdaftar.
  if (isOwner) {
    const allPermissions = await prisma.permission.findMany({
      select: {
        key: true,
      },
    })

    for (const permission of allPermissions) {
      permissions.add(permission.key)
    }
  }

  return {
    userId: user.id,
    companyId: user.companyId,
    permissions,
    highestRoleLevel,
    isOwner,
  }
}

// =============================================================
// PERMISSION CHECK
// =============================================================

export async function hasPermission(
  userId: number,
  companyId: number,
  permission: string,
): Promise<boolean> {
  const context = await getAuthorizationContext(
    userId,
    companyId,
  )

  return context.permissions.has(permission)
}

// =============================================================
// USER AUTHORITY
// =============================================================

export async function canManageUser(
  actorUserId: number,
  targetUserId: number,
  companyId: number,
): Promise<boolean> {
  const actor = await getAuthorizationContext(
    actorUserId,
    companyId,
  )

  const target = await getAuthorizationContext(
    targetUserId,
    companyId,
  )

  // Tidak boleh mengelola diri sendiri.
  if (actor.userId === target.userId) {
    return false
  }

  // User Owner hanya dapat dikelola oleh Owner.
  if (target.isOwner) {
    return actor.isOwner
  }

  // Owner dapat mengelola user non-Owner.
  if (actor.isOwner) {
    return true
  }

  // Non-Owner hanya dapat mengelola user dengan level lebih rendah.
  return actor.highestRoleLevel > target.highestRoleLevel
}

// =============================================================
// ROLE AUTHORITY
// =============================================================

export async function canManageRole(
  actorUserId: number,
  roleId: number,
  companyId: number,
): Promise<boolean> {
  const actor = await getAuthorizationContext(
    actorUserId,
    companyId,
  )

  const role = await prisma.role.findFirst({
    where: {
      id: roleId,
      companyId,
    },
    select: {
      id: true,
      name: true,
      level: true,
      isSystemRole: true,
    },
  })

  if (!role) {
    return false
  }

  if (actor.isOwner) {
    return true
  }

  // Non-Owner tidak boleh mengelola system role.
  if (role.isSystemRole) {
    return false
  }

  return actor.highestRoleLevel > role.level
}

// =============================================================
// GRANT PERMISSION AUTHORITY
// =============================================================

export async function canGrantPermission(
  actorUserId: number,
  permissionId: number,
  companyId: number,
): Promise<boolean> {
  const actor = await getAuthorizationContext(
    actorUserId,
    companyId,
  )

  if (actor.isOwner) {
    return true
  }

  const permission = await prisma.permission.findUnique({
    where: {
      id: permissionId,
    },
    select: {
      id: true,
      key: true,
    },
  })

  if (!permission) {
    return false
  }

  return actor.permissions.has(permission.key)
}

// =============================================================
// DELEGATION AUTHORITY
// =============================================================

export async function canDelegatePermission(
  actorUserId: number,
  delegateUserId: number,
  permissionId: number,
  companyId: number,
  targetUserId?: number | null,
  targetRoleId?: number | null,
): Promise<boolean> {
  const actor = await getAuthorizationContext(
    actorUserId,
    companyId,
  )

  const delegate = await getAuthorizationContext(
    delegateUserId,
    companyId,
  )

  // Tidak boleh mendelegasikan kepada diri sendiri.
  if (actor.userId === delegate.userId) {
    return false
  }

  // Hanya boleh menggunakan salah satu jenis target.
  if (targetUserId != null && targetRoleId != null) {
    return false
  }

  // Pastikan permission memang terdaftar.
  const permission = await prisma.permission.findUnique({
    where: {
      id: permissionId,
    },
    select: {
      id: true,
      key: true,
    },
  })

  if (!permission) {
    return false
  }

  // Non-Owner harus memiliki permission yang akan didelegasikan.
  if (
    !actor.isOwner &&
    !actor.permissions.has(permission.key)
  ) {
    return false
  }

  // -----------------------------------------------------------
  // VALIDASI TARGET USER
  // -----------------------------------------------------------

  if (targetUserId != null) {
    if (
      targetUserId === actorUserId ||
      targetUserId === delegateUserId
    ) {
      return false
    }

    let targetContext: AuthorizationContext

    try {
      targetContext = await getAuthorizationContext(
        targetUserId,
        companyId,
      )
    } catch {
      return false
    }

    // Target tidak boleh berupa Owner.
    if (targetContext.isOwner) {
      return false
    }

    // Penerima delegasi harus memiliki authority atas target.
    if (
      !(await canManageUser(
        delegateUserId,
        targetUserId,
        companyId,
      ))
    ) {
      return false
    }
  }

  // -----------------------------------------------------------
  // VALIDASI TARGET ROLE
  // -----------------------------------------------------------

  if (targetRoleId != null) {
    const targetRole = await prisma.role.findFirst({
      where: {
        id: targetRoleId,
        companyId,
      },
      select: {
        id: true,
        name: true,
        level: true,
        isSystemRole: true,
      },
    })

    if (!targetRole) {
      return false
    }

    // Role Owner tidak boleh menjadi target.
    if (
      targetRole.isSystemRole &&
      targetRole.name.toLowerCase() === 'owner'
    ) {
      return false
    }

    // Pemeriksaan ini berlaku juga ketika actor adalah Owner.
    if (
      !(await canManageRole(
        delegateUserId,
        targetRoleId,
        companyId,
      ))
    ) {
      return false
    }
  }

  // -----------------------------------------------------------
  // OWNER
  // -----------------------------------------------------------

  // Owner tidak memerlukan delegasi induk, tetapi seluruh
  // validasi target di atas tetap berlaku.
  if (actor.isOwner) {
    return !delegate.isOwner
  }

  // -----------------------------------------------------------
  // DELEGATED USER
  // -----------------------------------------------------------

  // Penerima tidak boleh memiliki level yang sama atau lebih tinggi.
  if (
    delegate.highestRoleLevel >= actor.highestRoleLevel
  ) {
    return false
  }

  // Cari delegasi induk yang masih aktif dan mengizinkan penerusan.
  const delegations =
    await prisma.permissionDelegation.findMany({
      where: {
        companyId,
        delegateUserId: actorUserId,
        permissionId,
        canDelegate: true,
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: new Date(),
            },
          },
        ],
      },
      select: {
        id: true,
        targetUserId: true,
        targetRoleId: true,
        expiresAt: true,
      },
    })

  if (delegations.length === 0) {
    return false
  }

  // Tanpa target hanya boleh jika delegasi induk juga tidak dibatasi.
  if (targetUserId == null && targetRoleId == null) {
    return delegations.some(
      (item) =>
        item.targetUserId == null &&
        item.targetRoleId == null,
    )
  }

  // -----------------------------------------------------------
  // SCOPE TARGET USER
  // -----------------------------------------------------------

  if (targetUserId != null) {
    for (const item of delegations) {
      // Delegasi induk tanpa batas dapat mencakup target ini.
      if (
        item.targetUserId == null &&
        item.targetRoleId == null
      ) {
        return true
      }

      // Delegasi yang secara khusus ditujukan ke user ini.
      if (item.targetUserId === targetUserId) {
        return true
      }

      // Jika scope induk berupa role, user harus memiliki role itu.
      if (item.targetRoleId != null) {
        const userHasRole = await prisma.userRole.findFirst({
          where: {
            userId: targetUserId,
            roleId: item.targetRoleId,
          },
          select: {
            id: true,
          },
        })

        if (userHasRole) {
          return true
        }
      }
    }

    return false
  }

  // -----------------------------------------------------------
  // SCOPE TARGET ROLE
  // -----------------------------------------------------------

  if (targetRoleId != null) {
    return delegations.some(
      (item) =>
        (
          item.targetUserId == null &&
          item.targetRoleId == null
        ) ||
        item.targetRoleId === targetRoleId,
    )
  }

  return false
}

// =============================================================
// EFFECTIVE PERMISSIONS
// =============================================================

export async function getEffectivePermissionKeys(
  userId: number,
  companyId: number,
): Promise<string[]> {
  const context = await getAuthorizationContext(
    userId,
    companyId,
  )

  return [...context.permissions].sort()
}

// =============================================================
// EXPORT
// =============================================================

export const authorizationService = {
  getContext: getAuthorizationContext,
  hasPermission,
  canManageUser,
  canManageRole,
  canGrantPermission,
  canDelegatePermission,
  getEffectivePermissionKeys,
}

export default authorizationService