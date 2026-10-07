import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../lib/db.js'

const COOKIE_NAME = 'hr_management_token'

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

const TOKEN_EXPIRES_IN = '8h'

type JwtPayload = {
  sub: string
  companyId: string
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

async function getUserAccess(userId: number) {
  const user = await prisma.user.findUnique({
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
          code: true,
          name: true,
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
                      id: true,
                      key: true,
                      name: true,
                      module: true,
                      action: true,
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
              id: true,
              key: true,
              name: true,
              module: true,
              action: true,
            },
          },
        },
      },
    },
  })

  return user
}

function buildPermissions(
  user: NonNullable<
    Awaited<ReturnType<typeof getUserAccess>>
  >,
) {
  const permissionMap = new Map<
    string,
    {
      id: number
      key: string
      name: string
      module: string
      action: string
    }
  >()

  // Permission dari role
  for (const userRole of user.userRoles) {
    for (
      const rolePermission
      of userRole.role.rolePermissions
    ) {
      const permission =
        rolePermission.permission

      permissionMap.set(
        permission.key,
        permission,
      )
    }
  }

  // Permission langsung ke user
  for (
    const userPermission
    of user.userPermissions
  ) {
    const permission =
      userPermission.permission

    if (
      userPermission.effect === 'DENY'
    ) {
      permissionMap.delete(
        permission.key,
      )

      continue
    }

    permissionMap.set(
      permission.key,
      permission,
    )
  }

  return Array.from(
    permissionMap.values(),
  )
}

function buildRoles(
  user: NonNullable<
    Awaited<ReturnType<typeof getUserAccess>>
  >,
) {
  return user.userRoles
    .map(
      ({
        role,
      }) => ({
        id: role.id,
        name: role.name,
        level: role.level,
        isSystemRole:
          role.isSystemRole,
      }),
    )
    .sort(
      (a, b) =>
        b.level - a.level,
    )
}

function buildUserResponse(
  user: NonNullable<
    Awaited<ReturnType<typeof getUserAccess>>
  >,
) {
  return {
    id: user.id,

    company: {
      id: user.company.id,
      code: user.company.code,
      name: user.company.name,
      status: user.company.status,
    },

    name: user.name,
    username: user.username,

    roles: buildRoles(user),

    permissions:
      buildPermissions(user),
  }
}


// =========================================================
// LOGIN
// =========================================================

export async function login(
  req: Request,
  res: Response,
) {
  try {
    const {
      username,
      password,
    } = req.body ?? {}

    // -----------------------------------------------------
    // Validasi input
    // -----------------------------------------------------

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Username dan password wajib diisi.',
      })
    }

    // -----------------------------------------------------
    // Cari user
    // -----------------------------------------------------

    const user =
      await prisma.user.findUnique({
        where: {
          username:
            username.trim(),
        },

        select: {
          id: true,
          companyId: true,
          name: true,
          username: true,
          passwordHash: true,
          status: true,

          company: {
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
            },
          },
        },
      })

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          'Username atau password salah.',
      })
    }

    // -----------------------------------------------------
    // Cek password
    // -----------------------------------------------------

    const passwordValid =
      await bcrypt.compare(
        password,
        user.passwordHash,
      )

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message:
          'Username atau password salah.',
      })
    }

    // -----------------------------------------------------
    // Cek status user
    // -----------------------------------------------------

    if (
      user.status !== 'ACTIVE'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Akun kamu sedang tidak aktif.',
      })
    }

    // -----------------------------------------------------
    // Cek status company
    // -----------------------------------------------------

    if (
      user.company.status !==
      'ACTIVE'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Perusahaan kamu sedang tidak aktif.',
      })
    }

    // -----------------------------------------------------
    // Ambil JWT secret
    // -----------------------------------------------------

    const jwtSecret =
      getJwtSecret()

    // -----------------------------------------------------
    // Buat JWT
    // -----------------------------------------------------

    const token =
      jwt.sign(
        {
          sub: String(user.id),
          companyId:
            String(user.companyId),
        },

        jwtSecret,

        {
          expiresIn:
            TOKEN_EXPIRES_IN,

          algorithm: 'HS256',
        },
      )

    // -----------------------------------------------------
    // Simpan JWT ke HTTP-only cookie
    // -----------------------------------------------------

    res.cookie(
      COOKIE_NAME,
      token,
      {
        ...cookieOptions,

        maxAge:
          8 *
          60 *
          60 *
          1000,
      },
    )

    // -----------------------------------------------------
    // Ambil access terbaru
    // -----------------------------------------------------

    const access =
      await getUserAccess(
        user.id,
      )

    if (!access) {
      return res.status(401).json({
        success: false,
        message:
          'Data pengguna tidak ditemukan.',
      })
    }

    return res.status(200).json({
      success: true,

      message:
        'Login berhasil. Selamat datang!',

      data: {
        user:
          buildUserResponse(
            access,
          ),
      },
    })
  } catch (error) {
    console.error(
      'Login error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}


// =========================================================
// ME
// =========================================================

export async function me(
  req: Request,
  res: Response,
) {
  try {
    // -----------------------------------------------------
    // Ambil token dari cookie
    // -----------------------------------------------------

    const token =
      req.cookies?.[
        COOKIE_NAME
      ]

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          'Silakan login terlebih dahulu.',
      })
    }

    // -----------------------------------------------------
    // JWT secret
    // -----------------------------------------------------

    const jwtSecret =
      getJwtSecret()

    // -----------------------------------------------------
    // Verifikasi token
    // -----------------------------------------------------

    let decoded: JwtPayload

    try {
      const payload =
        jwt.verify(
          token,
          jwtSecret,
          {
            algorithms: [
              'HS256',
            ],
          },
        )

      if (
        typeof payload ===
          'string' ||
        typeof payload.sub !==
          'string' ||
        typeof payload.companyId !==
          'string'
      ) {
        throw new Error(
          'Token tidak valid.',
        )
      }

      decoded =
        payload as JwtPayload
    } catch {
      return res.status(401).json({
        success: false,
        message:
          'Sesi kamu sudah tidak valid. Silakan login lagi.',
      })
    }

    // -----------------------------------------------------
    // Parse user ID
    // -----------------------------------------------------

    const userId =
      Number(decoded.sub)

    const companyId =
      Number(
        decoded.companyId,
      )

    if (
      !Number.isSafeInteger(
        userId,
      ) ||
      userId <= 0 ||
      !Number.isSafeInteger(
        companyId,
      ) ||
      companyId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Sesi tidak valid.',
      })
    }

    // -----------------------------------------------------
    // Ambil data user terbaru
    // -----------------------------------------------------

    const user =
      await getUserAccess(
        userId,
      )

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          'Akun tidak ditemukan atau sudah tidak aktif.',
      })
    }

    // -----------------------------------------------------
    // Pastikan token dan user masih berada
    // pada company yang sama
    // -----------------------------------------------------

    if (
      user.companyId !==
      companyId
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Sesi perusahaan tidak valid.',
      })
    }

    // -----------------------------------------------------
    // Cek status user
    // -----------------------------------------------------

    if (
      user.status !== 'ACTIVE'
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Akun tidak ditemukan atau sudah tidak aktif.',
      })
    }

    // -----------------------------------------------------
    // Cek status company
    // -----------------------------------------------------

    if (
      user.company.status !==
      'ACTIVE'
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Perusahaan kamu sedang tidak aktif.',
      })
    }

    return res.status(200).json({
      success: true,

      message:
        'Data pengguna berhasil diambil.',

      data: {
        user:
          buildUserResponse(
            user,
          ),
      },
    })
  } catch (error) {
    console.error(
      'Me error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}


// =========================================================
// LOGOUT
// =========================================================

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
    message:
      'Logout berhasil.',
  })
}