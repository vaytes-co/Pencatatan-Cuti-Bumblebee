import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import prisma from '../lib/db.js'

const COOKIE_NAME = 'leave_management_token'

export interface AuthenticatedRequest extends Request {
  user: {
    id: number
    name: string
    username: string
    role: string
  }
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

    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      console.error('JWT_SECRET belum dikonfigurasi.')

      return res.status(500).json({
        success: false,
        message: 'Konfigurasi server belum lengkap.',
      })
    }

    let decoded: jwt.JwtPayload

    try {
      const payload = jwt.verify(
        token,
        jwtSecret,
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

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
      },
    })

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message:
          'Akun tidak ditemukan atau sudah tidak aktif.',
      })
    }

    ;(req as AuthenticatedRequest).user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}