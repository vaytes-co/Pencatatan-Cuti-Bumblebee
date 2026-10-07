import type {
  NextFunction,
  Request,
  Response,
} from 'express'

import jwt from 'jsonwebtoken'

import prisma from '../lib/db.js'

// =========================================================
// TYPES
// =========================================================

export type PlatformAuthenticatedUser = {
  id: number
  name: string
  username: string
  roles: {
    id: number
    name: string
    level: number
    isSystemRole: boolean
  }[]
  permissions: string[]
}

export type PlatformAuthenticatedRequest =
  Request & {
    user: PlatformAuthenticatedUser
  }

// =========================================================
// HELPERS
// =========================================================

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error(
      'JWT_SECRET belum dikonfigurasi di file .env.',
    )
  }

  return secret
}

function buildPermissions(
  roles: {
    platformRolePermissions: {
      permission: {
        key: string
      }
    }[]
  }[],
): string[] {
  const permissionSet = new Set<string>()

  for (const role of roles) {
    for (const item of role.platformRolePermissions) {
      permissionSet.add(
        item.permission.key,
      )
    }
  }

  return Array.from(permissionSet).sort()
}

// =========================================================
// MIDDLEWARE
// =========================================================

export async function platformAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token =
      req.cookies?.hr_platform_token

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          'Silakan login sebagai Platform User terlebih dahulu.',
      })
    }

    const decoded =
      jwt.verify(
        token,
        getJwtSecret(),
        {
          algorithms: ['HS256'],
        },
      )

    if (
      typeof decoded !== 'object' ||
      decoded === null
    ) {
      return res.status(401).json({
        success: false,
        message: 'Token platform tidak valid.',
      })
    }

    if (
      decoded.type !== 'platform' ||
      typeof decoded.sub !== 'string'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Token platform tidak valid.',
      })
    }

    const platformUserId =
      Number(decoded.sub)

    if (
      !Number.isSafeInteger(
        platformUserId,
      ) ||
      platformUserId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message: 'Token platform tidak valid.',
      })
    }

    const platformUser =
      await prisma.platformUser.findUnique({
        where: {
          id: platformUserId,
        },

        include: {
          platformUserRoles: {
            include: {
              platformRole: {
                include: {
                  platformRolePermissions: {
                    include: {
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
        },
      })

    if (!platformUser) {
      return res.status(401).json({
        success: false,
        message:
          'Platform User tidak ditemukan.',
      })
    }

    if (
      platformUser.status !== 'ACTIVE'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Akun platform kamu sedang tidak aktif.',
      })
    }

    const roles =
      platformUser.platformUserRoles
        .map(
          (item) =>
            item.platformRole,
        )
        .sort(
          (a, b) =>
            b.level - a.level,
        )

    const permissions =
      buildPermissions(roles)

    const authenticatedUser: PlatformAuthenticatedUser =
      {
        id: platformUser.id,
        name: platformUser.name,
        username: platformUser.username,

        roles: roles.map(
          (role) => ({
            id: role.id,
            name: role.name,
            level: role.level,
            isSystemRole:
              role.isSystemRole,
          }),
        ),

        permissions,
      }

    ;(
      req as PlatformAuthenticatedRequest
    ).user = authenticatedUser

    next()
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Session platform sudah kedaluwarsa. Silakan login kembali.',
      })
    }

    if (
      error instanceof jwt.JsonWebTokenError
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Token platform tidak valid.',
      })
    }

    console.error(
      'Platform auth middleware error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}