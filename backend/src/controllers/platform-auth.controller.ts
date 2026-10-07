import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import type { Request, Response } from 'express'

import prisma from '../lib/db.js'
import type { PlatformAuthenticatedRequest } from '../middlewares/platform-auth.middleware.js'

// =========================================================
// TYPES
// =========================================================

type PlatformPermissionRecord = {
  permission: {
    key: string
  }
}

type PlatformRoleRecord = {
  id: number
  name: string
  level: number
  isSystemRole: boolean
  platformRolePermissions: PlatformPermissionRecord[]
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

function buildPlatformPermissions(
  roles: PlatformRoleRecord[],
): string[] {
  const permissionSet = new Set<string>()

  for (const role of roles) {
    for (const item of role.platformRolePermissions) {
      permissionSet.add(item.permission.key)
    }
  }

  return Array.from(permissionSet).sort()
}

function buildPlatformRoles(
  roles: PlatformRoleRecord[],
) {
  return [...roles]
    .sort((a, b) => b.level - a.level)
    .map((role) => ({
      id: role.id,
      name: role.name,
      level: role.level,
      isSystemRole: role.isSystemRole,
    }))
}

// =========================================================
// LOGIN
// =========================================================

export async function platformLogin(
  req: Request,
  res: Response,
) {
  try {
    const username =
      typeof req.body?.username === 'string'
        ? req.body.username.trim()
        : ''

    const password =
      typeof req.body?.password === 'string'
        ? req.body.password
        : ''

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username wajib diisi.',
      })
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password wajib diisi.',
      })
    }

    const platformUser =
      await prisma.platformUser.findUnique({
        where: {
          username,
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
        message: 'Username atau password salah.',
      })
    }

    if (platformUser.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message:
          'Akun platform kamu sedang tidak aktif.',
      })
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        platformUser.passwordHash,
      )

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.',
      })
    }

    const roles =
      platformUser.platformUserRoles.map(
        (item) => item.platformRole,
      )

    const permissions =
      buildPlatformPermissions(roles)

    const responseRoles =
      buildPlatformRoles(roles)

    const token = jwt.sign(
      {
        sub: String(platformUser.id),
        type: 'platform',
      },
      getJwtSecret(),
      {
        expiresIn: '8h',
        algorithm: 'HS256',
      },
    )

    res.cookie(
      'hr_platform_token',
      token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === 'production',
        sameSite:
          process.env.NODE_ENV === 'production'
            ? 'none'
            : 'lax',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/',
      },
    )

    return res.status(200).json({
      success: true,
      message: 'Login platform berhasil.',
      data: {
        id: platformUser.id,
        name: platformUser.name,
        username: platformUser.username,
        roles: responseRoles,
        permissions,
      },
    })
  } catch (error) {
    console.error(
      'Platform login error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

export async function platformMe(
  req: Request,
  res: Response,
): Promise<void> {
  const platformRequest = req as PlatformAuthenticatedRequest

  const platformUser = await prisma.platformUser.findUnique({
    where: {
      id: platformRequest.user.id,
    },
    include: {
      platformUserRoles: {
        include: {
          platformRole: {
            include: {
              platformRolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!platformUser || platformUser.status !== 'ACTIVE') {
    res.status(401).json({
      success: false,
      message: 'Platform user tidak ditemukan atau tidak aktif.',
    })
    return
  }

  const roles = platformUser.platformUserRoles
    .map((item) => ({
      id: item.platformRole.id,
      name: item.platformRole.name,
      level: item.platformRole.level,
      isSystemRole: item.platformRole.isSystemRole,
    }))
    .sort((a, b) => b.level - a.level)

  const permissions = Array.from(
    new Set(
      platformUser.platformUserRoles.flatMap((userRole) =>
        userRole.platformRole.platformRolePermissions.map(
          (rolePermission) => rolePermission.permission.key,
        ),
      ),
    ),
  ).sort()

  res.status(200).json({
    success: true,
    data: {
      id: platformUser.id,
      name: platformUser.name,
      username: platformUser.username,
      roles,
      permissions,
    },
  })
}

export function platformLogout(
  _req: Request,
  res: Response,
): void {
  res.clearCookie('hr_platform_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite:
      process.env.NODE_ENV === 'production'
        ? 'none'
        : 'lax',
    path: '/',
  })

  res.status(200).json({
    success: true,
    message: 'Logout platform berhasil.',
  })
}