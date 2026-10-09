import type {
  Request,
  Response,
} from 'express'

import prisma from '../lib/db.js'

import type {
  AuthenticatedRequest,
} from '../middlewares/auth.middleware.js'

import {
  getCompanyId,
} from '../utils/tenant.js'

import auditService from '../services/audit.service.js'

import {
  canManageUser,
  canManageRole,
  canGrantPermission,
} from '../services/authorization.service.js'

function getActor(
  req: Request,
) {
  const authenticatedRequest =
    req as AuthenticatedRequest

  if (!authenticatedRequest.user) {
    throw new Error(
      'Authenticated user tidak tersedia.',
    )
  }

  return authenticatedRequest.user
}

function getRequestIp(
  req: Request,
): string | null {
  return req.ip || null
}

function getRequestUserAgent(
  req: Request,
): string | null {
  return req.get('user-agent') || null
}

function isOwnerRole(
  role: {
    name: string
    isSystemRole: boolean
  },
): boolean {
  return (
    role.isSystemRole &&
    role.name.toLowerCase() === 'owner'
  )
}

async function getCompanyOwnerId(
  companyId: number,
): Promise<number | null> {
  const company =
    await prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        ownerUserId: true,
      },
    })

  return company?.ownerUserId ?? null
}

async function getUserInCompany(
  userId: number,
  companyId: number,
) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      companyId,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      username: true,
      status: true,

      userRoles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              level: true,
              isSystemRole: true,
            },
          },
        },
      },
    },
  })
}

async function getRoleInCompany(
  roleId: number,
  companyId: number,
) {
  return prisma.role.findFirst({
    where: {
      id: roleId,
      companyId,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      description: true,
      level: true,
      isSystemRole: true,
    },
  })
}

// =====================================================
// PERMISSION LIST
// =====================================================

export async function getPermissions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await getCompanyId(
      req as AuthenticatedRequest,
    )

    const permissions =
      await prisma.permission.findMany({
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          module: true,
          action: true,
        },

        orderBy: [
          {
            module: 'asc',
          },
          {
            action: 'asc',
          },
          {
            name: 'asc',
          },
        ],
      })

    res.status(200).json({
      success: true,
      message:
        'Data permission berhasil diambil.',
      data: {
        permissions,
      },
    })
  } catch (error) {
    console.error(
      'Get permissions error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// ASSIGN ROLE
// =====================================================

export async function assignRole(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor =
      getActor(req)

    const companyId =
      getCompanyId(
        req as AuthenticatedRequest,
      )

    const userId =
      Number(req.params.userId)

    const roleId =
      Number(req.params.roleId)

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !Number.isSafeInteger(roleId) ||
      roleId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'User ID atau Role ID tidak valid.',
      })

      return
    }

    const targetUser =
      await getUserInCompany(
        userId,
        companyId,
      )

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message:
          'Pengguna tidak ditemukan.',
      })

      return
    }

    const role =
      await getRoleInCompany(
        roleId,
        companyId,
      )

    if (!role) {
      res.status(404).json({
        success: false,
        message:
          'Role tidak ditemukan.',
      })

      return
    }

    // ---------------------------------------------------
    // USER AUTHORITY
    // ---------------------------------------------------

    const canManage =
      await canManageUser(
        actor.id,
        targetUser.id,
        companyId,
      )

    if (!canManage) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki authority untuk mengubah user ini.',
      })

      return
    }

    // ---------------------------------------------------
    // ROLE AUTHORITY
    // ---------------------------------------------------

    const canManageTargetRole =
      await canManageRole(
        actor.id,
        role.id,
        companyId,
      )

    if (!canManageTargetRole) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki authority untuk memberikan role ini.',
      })

      return
    }

    const ownerUserId =
      await getCompanyOwnerId(
        companyId,
      )

    // ---------------------------------------------------
    // OWNER ROLE PROTECTION
    // ---------------------------------------------------

    if (
      isOwnerRole(role)
    ) {
      if (
        actor.id !== ownerUserId
      ) {
        res.status(403).json({
          success: false,
          message:
            'Hanya Owner yang dapat memberikan role Owner.',
        })

        return
      }

      res.status(403).json({
        success: false,
        message:
          'Role Owner hanya boleh dimiliki oleh Owner utama perusahaan.',
      })

      return
    }

    // ---------------------------------------------------
    // EXISTING ROLE
    // ---------------------------------------------------

    const existing =
      await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },

        select: {
          id: true,
          userId: true,
          roleId: true,
        },
      })

    if (existing) {
      res.status(409).json({
        success: false,
        message:
          'Pengguna sudah memiliki role tersebut.',
      })

      return
    }

    // ---------------------------------------------------
    // ASSIGN
    // ---------------------------------------------------

    const userRole =
      await prisma.userRole.create({
        data: {
          userId,
          roleId,
        },

        select: {
          id: true,
          userId: true,
          roleId: true,
          createdAt: true,

          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },

          role: {
            select: {
              id: true,
              name: true,
              level: true,
              isSystemRole: true,
            },
          },
        },
      })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'ASSIGN',
      entity: 'UserRole',
      entityId: userRole.id,
      afterData: userRole,
      ipAddress:
        getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
    })

    res.status(201).json({
      success: true,
      message:
        'Role berhasil diberikan kepada pengguna.',
      data: {
        userRole,
      },
    })
  } catch (error) {
    console.error(
      'Assign role error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// REVOKE ROLE
// =====================================================

export async function revokeRole(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor =
      getActor(req)

    const companyId =
      getCompanyId(
        req as AuthenticatedRequest,
      )

    const userId =
      Number(req.params.userId)

    const roleId =
      Number(req.params.roleId)

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !Number.isSafeInteger(roleId) ||
      roleId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'User ID atau Role ID tidak valid.',
      })

      return
    }

    const user =
      await getUserInCompany(
        userId,
        companyId,
      )

    if (!user) {
      res.status(404).json({
        success: false,
        message:
          'Pengguna tidak ditemukan.',
      })

      return
    }

    const role =
      await getRoleInCompany(
        roleId,
        companyId,
      )

    if (!role) {
      res.status(404).json({
        success: false,
        message:
          'Role tidak ditemukan.',
      })

      return
    }

    // ---------------------------------------------------
    // USER AUTHORITY
    // ---------------------------------------------------

    const canManage =
      await canManageUser(
        actor.id,
        user.id,
        companyId,
      )

    if (!canManage) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki authority untuk mengubah user ini.',
      })

      return
    }

    // ---------------------------------------------------
    // ROLE AUTHORITY
    // ---------------------------------------------------

    const canManageTargetRole =
      await canManageRole(
        actor.id,
        role.id,
        companyId,
      )

    if (!canManageTargetRole) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki authority untuk mencabut role ini.',
      })

      return
    }

    if (
      isOwnerRole(role)
    ) {
      res.status(403).json({
        success: false,
        message:
          'Role Owner tidak dapat dicabut.',
      })

      return
    }

    const ownerUserId =
      await getCompanyOwnerId(
        companyId,
      )

    if (
      userId === ownerUserId
    ) {
      res.status(403).json({
        success: false,
        message:
          'Role milik Owner utama tidak dapat diubah.',
      })

      return
    }

    const existing =
      await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },

        select: {
          id: true,
          userId: true,
          roleId: true,
          createdAt: true,
        },
      })

    if (!existing) {
      res.status(404).json({
        success: false,
        message:
          'User tidak memiliki role tersebut.',
      })

      return
    }

    await prisma.userRole.delete({
      where: {
        id: existing.id,
      },
    })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'REVOKE',
      entity: 'UserRole',
      entityId: existing.id,

      beforeData: {
        ...existing,
        user: {
          id: user.id,
          name: user.name,
          username:
            user.username,
        },
        role,
      },

      ipAddress:
        getRequestIp(req),

      userAgent:
        getRequestUserAgent(req),
    })

    res.status(200).json({
      success: true,
      message:
        'Role berhasil dicabut dari pengguna.',
    })
  } catch (error) {
    console.error(
      'Revoke role error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// GRANT / DENY DIRECT PERMISSION
// =====================================================

export async function setUserPermission(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor =
      getActor(req)

    const companyId =
      getCompanyId(
        req as AuthenticatedRequest,
      )

    const userId =
      Number(req.params.userId)

    const permissionId =
      Number(
        req.params.permissionId,
      )

    const effect =
      req.body?.effect

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !Number.isSafeInteger(
        permissionId,
      ) ||
      permissionId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'User ID atau Permission ID tidak valid.',
      })

      return
    }

    if (
      effect !== 'ALLOW' &&
      effect !== 'DENY'
    ) {
      res.status(400).json({
        success: false,
        message:
          'Effect permission harus ALLOW atau DENY.',
      })

      return
    }

    const targetUser =
      await getUserInCompany(
        userId,
        companyId,
      )

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message:
          'Pengguna tidak ditemukan.',
      })

      return
    }

    if (
      userId === actor.id
    ) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak dapat mengubah permission langsung untuk akun sendiri.',
      })

      return
    }

    const permission =
      await prisma.permission.findUnique({
        where: {
          id: permissionId,
        },

        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          module: true,
          action: true,
        },
      })

    if (!permission) {
      res.status(404).json({
        success: false,
        message:
          'Permission tidak ditemukan.',
      })

      return
    }

    const ownerUserId =
      await getCompanyOwnerId(
        companyId,
      )

    if (
      userId === ownerUserId
    ) {
      res.status(403).json({
        success: false,
        message:
          'Permission Owner tidak dapat diubah melalui direct permission.',
      })

      return
    }

    // ---------------------------------------------------
    // USER AUTHORITY
    // ---------------------------------------------------

    const canManage =
      await canManageUser(
        actor.id,
        targetUser.id,
        companyId,
      )

    if (!canManage) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki authority untuk mengubah user ini.',
      })

      return
    }

    // ---------------------------------------------------
    // PERMISSION AUTHORITY
    // ---------------------------------------------------

    const canGrant =
      await canGrantPermission(
        actor.id,
        permission.id,
        companyId,
      )

    if (!canGrant) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak boleh memberikan permission yang tidak kamu miliki.',
      })

      return
    }

    const existing =
      await prisma.userPermission.findUnique({
        where: {
          userId_permissionId: {
            userId,
            permissionId,
          },
        },

        select: {
          id: true,
          userId: true,
          permissionId: true,
          effect: true,
          createdAt: true,
          updatedAt: true,
        },
      })

    const updated =
      await prisma.userPermission.upsert({
        where: {
          userId_permissionId: {
            userId,
            permissionId,
          },
        },

        create: {
          userId,
          permissionId,
          effect,
        },

        update: {
          effect,
        },

        select: {
          id: true,
          userId: true,
          permissionId: true,
          effect: true,
          createdAt: true,
          updatedAt: true,
        },
      })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,

      action:
        existing
          ? 'UPDATE'
          : 'GRANT',

      entity: 'UserPermission',
      entityId: updated.id,

      beforeData:
        existing
          ? {
              ...existing,
              permission,
            }
          : undefined,

      afterData: {
        ...updated,
        permission,

        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          username:
            targetUser.username,
        },
      },

      ipAddress:
        getRequestIp(req),

      userAgent:
        getRequestUserAgent(req),
    })

    res.status(
      existing ? 200 : 201,
    ).json({
      success: true,

      message:
        existing
          ? 'Permission pengguna berhasil diperbarui.'
          : 'Permission berhasil diberikan kepada pengguna.',

      data: {
        userPermission: updated,
        permission,
      },
    })
  } catch (error) {
    console.error(
      'Set user permission error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// REVOKE DIRECT PERMISSION
// =====================================================

export async function revokeUserPermission(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor =
      getActor(req)

    const companyId =
      getCompanyId(
        req as AuthenticatedRequest,
      )

    const userId =
      Number(req.params.userId)

    const permissionId =
      Number(
        req.params.permissionId,
      )

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !Number.isSafeInteger(
        permissionId,
      ) ||
      permissionId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'User ID atau Permission ID tidak valid.',
      })

      return
    }

    const ownerUserId =
      await getCompanyOwnerId(
        companyId,
      )

    if (
      userId === ownerUserId
    ) {
      res.status(403).json({
        success: false,
        message:
          'Permission Owner tidak dapat dicabut.',
      })

      return
    }

    if (
      userId === actor.id
    ) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak dapat mencabut permission langsung dari akun sendiri.',
      })

      return
    }

    const targetUser =
      await getUserInCompany(
        userId,
        companyId,
      )

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message:
          'Pengguna tidak ditemukan.',
      })

      return
    }

    const permission =
      await prisma.permission.findUnique({
        where: {
          id: permissionId,
        },

        select: {
          id: true,
          key: true,
          name: true,
          module: true,
          action: true,
        },
      })

    if (!permission) {
      res.status(404).json({
        success: false,
        message:
          'Permission tidak ditemukan.',
      })

      return
    }

    const existing =
      await prisma.userPermission.findFirst({
        where: {
          userId,
          permissionId,

          user: {
            companyId,
          },
        },

        select: {
          id: true,
          userId: true,
          permissionId: true,
          effect: true,
          createdAt: true,
          updatedAt: true,

          permission: {
            select: {
              id: true,
              key: true,
              name: true,
              module: true,
              action: true,
            },
          },
        },
      })

    if (!existing) {
      res.status(404).json({
        success: false,
        message:
          'Direct permission tidak ditemukan.',
      })

      return
    }

    const canManage =
      await canManageUser(
        actor.id,
        targetUser.id,
        companyId,
      )

    if (!canManage) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki authority untuk mengubah user ini.',
      })

      return
    }

    const canGrant =
      await canGrantPermission(
        actor.id,
        permission.id,
        companyId,
      )

    if (!canGrant) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak boleh mengelola permission yang tidak kamu miliki.',
      })

      return
    }

    await prisma.userPermission.delete({
      where: {
        id: existing.id,
      },
    })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,

      action: 'REVOKE',

      entity: 'UserPermission',
      entityId: existing.id,

      beforeData: {
        ...existing,

        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          username:
            targetUser.username,
        },
      },

      ipAddress:
        getRequestIp(req),

      userAgent:
        getRequestUserAgent(req),
    })

    res.status(200).json({
      success: true,
      message:
        'Direct permission berhasil dicabut.',
    })
  } catch (error) {
    console.error(
      'Revoke user permission error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}