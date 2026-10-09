import type {
  Request,
  Response,
} from 'express'

import bcrypt from 'bcrypt'

import prisma from '../lib/db.js'

import type {
  AuthenticatedRequest,
} from '../middlewares/auth.middleware.js'

import {
  getCompanyId,
} from '../utils/tenant.js'

import auditService from '../services/audit.service.js'

function normalizeString(
  value: unknown,
): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function getActor(
  req: Request,
) {
  const authenticatedRequest =
    req as AuthenticatedRequest

  if (
    !authenticatedRequest.user
  ) {
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

// =====================================================
// GET USERS
// =====================================================

export async function getUsers(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authenticatedRequest =
      req as AuthenticatedRequest

    const companyId =
      getCompanyId(
        authenticatedRequest,
      )

    const pageRaw =
      Number(req.query.page ?? 1)

    const limitRaw =
      Number(req.query.limit ?? 10)

    const page =
      Number.isSafeInteger(pageRaw) &&
      pageRaw > 0
        ? pageRaw
        : 1

    const limit =
      Number.isSafeInteger(limitRaw) &&
      limitRaw > 0 &&
      limitRaw <= 100
        ? limitRaw
        : 10

    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : ''

    const status =
      typeof req.query.status === 'string'
        ? req.query.status.trim()
        : ''

    const where = {
      companyId,

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                },
              },
              {
                username: {
                  contains: search,
                },
              },
            ],
          }
        : {}),

      ...(status === 'ACTIVE' ||
      status === 'INACTIVE'
        ? {
            status:
              status as
                | 'ACTIVE'
                | 'INACTIVE',
          }
        : {}),
    }

    const skip =
      (page - 1) * limit

    const [
      users,
      total,
    ] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,

        select: {
          id: true,
          companyId: true,
          name: true,
          username: true,
          status: true,
          employeeId: true,
          createdAt: true,
          updatedAt: true,

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

        orderBy: [
          {
            name: 'asc',
          },
        ],
      }),

      prisma.user.count({
        where,
      }),
    ])

    res.status(200).json({
      success: true,
      message:
        'Data pengguna berhasil diambil.',
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            Math.ceil(
              total / limit,
            ),
        },
      },
    })
  } catch (error) {
    console.error(
      'Get users error:',
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
// GET USER DETAIL
// =====================================================

export async function getUserById(
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
      Number(req.params.id)

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID pengguna tidak valid.',
      })
      return
    }

    const user =
      await prisma.user.findFirst({
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
          employeeId: true,
          createdAt: true,
          updatedAt: true,

          userRoles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
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
              id: true,
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

    if (!user) {
      res.status(404).json({
        success: false,
        message:
          'Pengguna tidak ditemukan.',
      })
      return
    }

    res.status(200).json({
      success: true,
      message:
        'Detail pengguna berhasil diambil.',
      data: {
        user,
        currentUser:
          actor.id === user.id,
      },
    })
  } catch (error) {
    console.error(
      'Get user detail error:',
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
// CREATE USER
// =====================================================

export async function createUser(
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

    const name =
      normalizeString(
        req.body?.name,
      )

    const username =
      normalizeString(
        req.body?.username,
      )

    const password =
      typeof req.body?.password ===
      'string'
        ? req.body.password
        : ''

    const employeeIdRaw =
      req.body?.employeeId

    const roleIdsRaw =
      req.body?.roleIds

    if (!name) {
      res.status(400).json({
        success: false,
        message:
          'Nama pengguna wajib diisi.',
      })
      return
    }

    if (!username) {
      res.status(400).json({
        success: false,
        message:
          'Username wajib diisi.',
      })
      return
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message:
          'Password minimal 8 karakter.',
      })
      return
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          username,
        },
        select: {
          id: true,
        },
      })

    if (existingUser) {
      res.status(409).json({
        success: false,
        message:
          'Username sudah digunakan.',
      })
      return
    }

    let employeeId:
      number | null = null

    if (
      employeeIdRaw !== undefined &&
      employeeIdRaw !== null &&
      employeeIdRaw !== ''
    ) {
      const parsed =
        Number(employeeIdRaw)

      if (
        !Number.isSafeInteger(parsed) ||
        parsed <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            'Employee ID tidak valid.',
        })
        return
      }

      const employee =
        await prisma.employee.findFirst({
          where: {
            id: parsed,
            companyId,
          },
          select: {
            id: true,
            user: {
              select: {
                id: true,
              },
            },
          },
        })

      if (!employee) {
        res.status(404).json({
          success: false,
          message:
            'Karyawan tidak ditemukan.',
        })
        return
      }

      if (employee.user) {
        res.status(409).json({
          success: false,
          message:
            'Karyawan tersebut sudah memiliki akun pengguna.',
        })
        return
      }

      employeeId =
        employee.id
    }

    const roleIds =
      Array.isArray(roleIdsRaw)
        ? Array.from(
            new Set(
              roleIdsRaw
                .map(Number)
                .filter(
                  (id) =>
                    Number.isSafeInteger(
                      id,
                    ) && id > 0,
                ),
            ),
          )
        : []

    if (roleIds.length > 0) {
      const roles =
        await prisma.role.findMany({
          where: {
            companyId,
            id: {
              in: roleIds,
            },
          },
          select: {
            id: true,
            name: true,
            level: true,
            isSystemRole: true,
          },
        })

      if (
        roles.length !==
        roleIds.length
      ) {
        res.status(400).json({
          success: false,
          message:
            'Salah satu role tidak valid untuk perusahaan ini.',
        })
        return
      }

      const ownerRole =
        roles.find(
          (role) =>
            isOwnerRole(role),
        )

      if (ownerRole) {
        if (
          actor.id !==
          (
            await prisma.company.findUnique({
              where: {
                id: companyId,
              },
              select: {
                ownerUserId: true,
              },
            })
          )?.ownerUserId
        ) {
          res.status(403).json({
            success: false,
            message:
              'Hanya Owner perusahaan yang dapat memberikan role Owner.',
          })
          return
        }
      }
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      )

    const result =
      await prisma.$transaction(
        async (tx) => {
          const user =
            await tx.user.create({
              data: {
                companyId,
                name,
                username,
                passwordHash,
                status: 'ACTIVE',
                employeeId,
              },
              select: {
                id: true,
                companyId: true,
                name: true,
                username: true,
                status: true,
                employeeId: true,
                createdAt: true,
                updatedAt: true,
              },
            })

          if (roleIds.length > 0) {
            await tx.userRole.createMany({
              data: roleIds.map(
                (roleId) => ({
                  userId: user.id,
                  roleId,
                }),
              ),
            })
          }

          return user
        },
      )

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'CREATE',
      entity: 'User',
      entityId: result.id,
      afterData: result,
      ipAddress:
        getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
    })

    res.status(201).json({
      success: true,
      message:
        'Pengguna berhasil dibuat.',
      data: {
        user: result,
      },
    })
  } catch (error) {
    console.error(
      'Create user error:',
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
// UPDATE USER
// =====================================================

export async function updateUser(
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
      Number(req.params.id)

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID pengguna tidak valid.',
      })
      return
    }

    const existing =
      await prisma.user.findFirst({
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
          employeeId: true,

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

    if (!existing) {
      res.status(404).json({
        success: false,
        message:
          'Pengguna tidak ditemukan.',
      })
      return
    }

    const company =
      await prisma.company.findUnique({
        where: {
          id: companyId,
        },
        select: {
          ownerUserId: true,
        },
      })

    const isTargetOwner =
      company?.ownerUserId === userId

    const nameProvided =
      Object.prototype.hasOwnProperty.call(
        req.body ?? {},
        'name',
      )

    const usernameProvided =
      Object.prototype.hasOwnProperty.call(
        req.body ?? {},
        'username',
      )

    const passwordProvided =
      Object.prototype.hasOwnProperty.call(
        req.body ?? {},
        'password',
      )

    if (
      isTargetOwner &&
      actor.id !== userId
    ) {
      if (
        nameProvided ||
        usernameProvided ||
        passwordProvided
      ) {
        res.status(403).json({
          success: false,
          message:
            'Akun Owner tidak dapat diubah oleh pengguna lain.',
        })
        return
      }
    }

    const data: {
      name?: string
      username?: string
      passwordHash?: string
    } = {}

    if (nameProvided) {
      const name =
        normalizeString(
          req.body?.name,
        )

      if (!name) {
        res.status(400).json({
          success: false,
          message:
            'Nama pengguna tidak boleh kosong.',
        })
        return
      }

      data.name = name
    }

    if (usernameProvided) {
      const username =
        normalizeString(
          req.body?.username,
        )

      if (!username) {
        res.status(400).json({
          success: false,
          message:
            'Username tidak boleh kosong.',
        })
        return
      }

      const usernameOwner =
        await prisma.user.findFirst({
          where: {
            username,
            NOT: {
              id: userId,
            },
          },
          select: {
            id: true,
          },
        })

      if (usernameOwner) {
        res.status(409).json({
          success: false,
          message:
            'Username sudah digunakan.',
        })
        return
      }

      data.username =
        username
    }

    if (passwordProvided) {
      const password =
        typeof req.body?.password ===
        'string'
          ? req.body.password
          : ''

      if (password.length < 8) {
        res.status(400).json({
          success: false,
          message:
            'Password minimal 8 karakter.',
        })
        return
      }

      data.passwordHash =
        await bcrypt.hash(
          password,
          12,
        )
    }

    if (
      Object.keys(data).length === 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'Tidak ada data pengguna yang diubah.',
      })
      return
    }

    const updated =
      await prisma.user.update({
        where: {
          id: userId,
        },
        data,

        select: {
          id: true,
          companyId: true,
          name: true,
          username: true,
          status: true,
          employeeId: true,
          createdAt: true,
          updatedAt: true,
        },
      })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      beforeData: existing,
      afterData: updated,
      ipAddress:
        getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
    })

    res.status(200).json({
      success: true,
      message:
        'Pengguna berhasil diperbarui.',
      data: {
        user: updated,
      },
    })
  } catch (error) {
    console.error(
      'Update user error:',
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
// ACTIVATE / DEACTIVATE USER
// =====================================================

async function changeUserStatus(
  req: Request,
  res: Response,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<void> {
  try {
    const actor =
      getActor(req)

    const companyId =
      getCompanyId(
        req as AuthenticatedRequest,
      )

    const userId =
      Number(req.params.id)

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID pengguna tidak valid.',
      })
      return
    }

    const existing =
      await prisma.user.findFirst({
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
          employeeId: true,
        },
      })

    if (!existing) {
      res.status(404).json({
        success: false,
        message:
          'Pengguna tidak ditemukan.',
      })
      return
    }

    const company =
      await prisma.company.findUnique({
        where: {
          id: companyId,
        },
        select: {
          ownerUserId: true,
        },
      })

    if (
      company?.ownerUserId === userId
    ) {
      res.status(403).json({
        success: false,
        message:
          'Akun Owner tidak dapat dinonaktifkan.',
      })
      return
    }

    if (existing.status === status) {
      res.status(400).json({
        success: false,
        message:
          status === 'ACTIVE'
            ? 'Pengguna sudah aktif.'
            : 'Pengguna sudah nonaktif.',
      })
      return
    }

    const updated =
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          status,
        },
        select: {
          id: true,
          companyId: true,
          name: true,
          username: true,
          status: true,
          employeeId: true,
        },
      })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action:
        status === 'ACTIVE'
          ? 'ACTIVATE'
          : 'DEACTIVATE',
      entity: 'User',
      entityId: userId,
      beforeData: existing,
      afterData: updated,
      ipAddress:
        getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
    })

    res.status(200).json({
      success: true,
      message:
        status === 'ACTIVE'
          ? 'Pengguna berhasil diaktifkan.'
          : 'Pengguna berhasil dinonaktifkan.',
      data: {
        user: updated,
      },
    })
  } catch (error) {
    console.error(
      'Change user status error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

export async function activateUser(
  req: Request,
  res: Response,
): Promise<void> {
  return changeUserStatus(
    req,
    res,
    'ACTIVE',
  )
}

export async function deactivateUser(
  req: Request,
  res: Response,
): Promise<void> {
  return changeUserStatus(
    req,
    res,
    'INACTIVE',
  )
}