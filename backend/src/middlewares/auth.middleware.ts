import type {
  NextFunction,
  Request,
  Response,
} from 'express'
import jwt from 'jsonwebtoken'

import prisma from '../lib/db.js'

import {
  getAuthorizationContext,
} from '../services/authorization.service.js'

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

  highestRoleLevel: number
  isOwner: boolean
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

async function getUserAccess(
  userId: number,
) {
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
    const token =
      req.cookies?.[COOKIE_NAME]

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          'Silakan login terlebih dahulu.',
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
        throw new Error(
          'Token tidak valid.',
        )
      }

      decoded = payload
    } catch {
      return res.status(401).json({
        success: false,
        message:
          'Sesi kamu sudah tidak valid. Silakan login lagi.',
      })
    }

    const userId =
      Number(decoded.sub)

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Sesi tidak valid.',
      })
    }

    const user =
      await getUserAccess(userId)

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

    // =======================================================
    // AUTHORIZATION CONTEXT
    // =======================================================
    //
    // Permission sekarang tidak lagi dihitung langsung
    // di middleware.
    //
    // Semua perhitungan authority dipusatkan di:
    //
    // authorization.service.ts
    //
    // Dengan begitu seluruh aplikasi menggunakan aturan
    // authorization yang sama.
    // =======================================================

    const authorization =
      await getAuthorizationContext(
        user.id,
        user.companyId,
      )

    const roles = user.userRoles
      .map(
        (userRole) =>
          userRole.role,
      )
      .sort(
        (a, b) =>
          b.level - a.level,
      )

    ;(
      req as AuthenticatedRequest
    ).user = {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      username: user.username,

      roles,

      permissions: [
        ...authorization.permissions,
      ],

      highestRoleLevel:
        authorization.highestRoleLevel,

      isOwner:
        authorization.isOwner,
    }

    next()
  } catch (error) {
    console.error(
      'Auth middleware error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

export default authMiddleware