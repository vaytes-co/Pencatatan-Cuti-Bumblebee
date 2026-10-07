import type {
  NextFunction,
  Request,
  Response,
} from 'express'
import jwt from 'jsonwebtoken'

import prisma from '../lib/db.js'

const COOKIE_NAME = 'hr_management_token'

export interface AuthenticatedUser {
  id: number
  companyId: number
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

export interface AuthenticatedRequest
  extends Request {
  user: AuthenticatedUser
}

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET belum dikonfigurasi.',
    )
  }

  return jwtSecret
}

function buildPermissions(
  user: NonNullable<
    Awaited<ReturnType<typeof getUserAccess>>
  >,
) {
  const permissionMap = new Map<
    string,
    'ALLOW' | 'DENY'
  >()

  for (const userRole of user.userRoles) {
    for (const rolePermission of userRole.role.rolePermissions) {
      permissionMap.set(
        rolePermission.permission.key,
        'ALLOW',
      )
    }
  }

  for (const userPermission of user.userPermissions) {
    permissionMap.set(
      userPermission.permission.key,
      userPermission.effect,
    )
  }

  return Array.from(permissionMap.entries())
    .filter(
      ([, effect]) => effect === 'ALLOW',
    )
    .map(([key]) => key)
    .sort()
}

async function getUserAccess(userId: number) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      username: true,
      status: true,

      company: {
        select: {
          id: true,
          status: true,
        },
      },

      userRoles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              level: true,
              isSystemRole: true,

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
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.[COOKIE_NAME]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Silakan login terlebih dahulu.',
      })
    }

    let decoded: jwt.JwtPayload

    try {
      const payload = jwt.verify(
        token,
        getJwtSecret(),
        {
          algorithms: ['HS256'],
        },
      )

      if (
        typeof payload === 'string' ||
        typeof payload.sub !== 'string'
      ) {
        throw new Error('Token tidak valid.')
      }

      decoded = payload
    } catch {
      return res.status(401).json({
        success: false,
        message:
          'Sesi kamu sudah tidak valid. Silakan login lagi.',
      })
    }

    const userId = Number(decoded.sub)

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message: 'Sesi tidak valid.',
      })
    }

    const user = await getUserAccess(userId)

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      user.company.status !== 'ACTIVE'
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Akun atau perusahaan tidak ditemukan atau sudah tidak aktif.',
      })
    }

    const roles = user.userRoles
      .map((userRole) => userRole.role)
      .sort((a, b) => b.level - a.level)

    const permissions = buildPermissions(user)

    ;(req as AuthenticatedRequest).user = {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      username: user.username,
      roles,
      permissions,
    }

    next()
  } catch (error) {
    console.error(
      'Auth middleware error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}