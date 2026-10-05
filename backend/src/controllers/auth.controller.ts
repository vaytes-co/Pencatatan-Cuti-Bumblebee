import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../lib/db.js'

const COOKIE_NAME = 'leave_management_token'

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export async function login(
  req: Request,
  res: Response,
) {
  try {
    const { username, password } = req.body ?? {}

    // Validasi input
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi.',
      })
    }

    // Cari user berdasarkan username
    const user = await prisma.user.findUnique({
      where: {
        username: username.trim(),
      },
    })

    // Username tidak ditemukan
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.',
      })
    }

    // Cek password dengan bcrypt
    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash,
    )

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.',
      })
    }

    // Cek status akun
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Akun kamu sedang tidak aktif.',
      })
    }

    // Ambil JWT secret
    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      throw new Error('JWT_SECRET belum dikonfigurasi.')
    }

    // Buat JWT
    const token = jwt.sign(
      {
        sub: String(user.id),
      },
      jwtSecret,
      {
        expiresIn: '8h',
        algorithm: 'HS256',
      },
    )

    // Simpan JWT ke HTTP-only cookie
    res.cookie(COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: 8 * 60 * 60 * 1000,
    })

    return res.status(200).json({
      success: true,
      message: 'Login berhasil. Selamat datang!',
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        },
      },
    })
  } catch (error) {
    console.error('Login error:', error)

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

export async function me(
  req: Request,
  res: Response,
) {
  try {
    // Ambil token dari cookie
    const token = req.cookies?.[COOKIE_NAME]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Silakan login terlebih dahulu.',
      })
    }

    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      throw new Error('JWT_SECRET belum dikonfigurasi.')
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

    // Ambil user terbaru dari database
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

    return res.status(200).json({
      success: true,
      message: 'Data pengguna berhasil diambil.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        },
      },
    })
  } catch (error) {
    console.error('Me error:', error)

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

export function logout(
  _req: Request,
  res: Response,
) {
  res.clearCookie(
    COOKIE_NAME,
    cookieOptions,
  )

  return res.status(200).json({
    success: true,
    message: 'Logout berhasil.',
  })
}