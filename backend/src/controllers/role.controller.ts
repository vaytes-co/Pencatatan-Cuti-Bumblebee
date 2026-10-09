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

function normalizeString(
  value: unknown,
): string {
  return typeof value === 'string'
    ? value.trim()
    : ''
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

async function getRoleSnapshot(
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
      createdAt: true,
      updatedAt: true,

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
  })
}

// =====================================================
// GET ROLES
// =====================================================

export async function getRoles(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const companyId =
      getCompanyId(
        req as AuthenticatedRequest,
      )

    const roles =
      await prisma.role.findMany({
        where: {
          companyId,
        },

        select: {
          id: true,
          companyId: true,
          name: true,
          description: true,
          level: true,
          isSystemRole: true,
          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              userRoles: true,
              rolePermissions: true,
            },
          },
        },

        orderBy: [
          {
            level: 'desc',
          },
          {
            name: 'asc',
          },
        ],
      })

    res.status(200).json({
      success: true,
      message:
        'Data role berhasil diambil.',
      data: {
        roles,
      },
    })
  } catch (error) {
    console.error(
      'Get roles error:',
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
// GET ROLE DETAIL
// =====================================================

export async function getRoleById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const companyId =
      getCompanyId(
        req as AuthenticatedRequest,
      )

    const roleId =
      Number(req.params.id)

    if (
      !Number.isSafeInteger(roleId) ||
      roleId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID role tidak valid.',
      })
      return
    }

    const role =
      await getRoleSnapshot(
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

    res.status(200).json({
      success: true,
      message:
        'Detail role berhasil diambil.',
      data: {
        role,
      },
    })
  } catch (error) {
    console.error(
      'Get role detail error:',
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
// CREATE ROLE
// =====================================================

export async function createRole(
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

    const description =
      normalizeString(
        req.body?.description,
      ) || null

    const levelRaw =
      Number(
        req.body?.level ?? 100,
      )

    const permissionIdsRaw =
      req.body?.permissionIds

    if (!name) {
      res.status(400).json({
        success: false,
        message:
          'Nama role wajib diisi.',
      })
      return
    }

    if (
      !Number.isInteger(levelRaw) ||
      levelRaw < 1 ||
      levelRaw > 999
    ) {
      res.status(400).json({
        success: false,
        message:
          'Level role harus antara 1 sampai 999.',
      })
      return
    }

    const existing =
      await prisma.role.findFirst({
        where: {
          companyId,
          name,
        },
        select: {
          id: true,
        },
      })

    if (existing) {
      res.status(409).json({
        success: false,
        message:
          'Nama role sudah digunakan.',
      })
      return
    }

    const permissionIds =
      Array.isArray(permissionIdsRaw)
        ? Array.from(
            new Set(
              permissionIdsRaw
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

    if (permissionIds.length > 0) {
      const permissionCount =
        await prisma.permission.count({
          where: {
            id: {
              in: permissionIds,
            },
          },
        })

      if (
        permissionCount !==
        permissionIds.length
      ) {
        res.status(400).json({
          success: false,
          message:
            'Salah satu permission tidak ditemukan.',
        })
        return
      }
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
      actor.id ===
      company?.ownerUserId
    ) {
      // Owner boleh membuat role sampai level 999.
    } else {
      const actorRoles =
        await prisma.userRole.findMany({
          where: {
            userId: actor.id,
            role: {
              companyId,
            },
          },
          select: {
            role: {
              select: {
                level: true,
              },
            },
          },
        })

      const highestActorLevel =
        Math.max(
          ...actorRoles.map(
            (item) =>
              item.role.level,
          ),
          0,
        )

      if (
        levelRaw >=
        highestActorLevel
      ) {
        res.status(403).json({
          success: false,
          message:
            'Kamu tidak dapat membuat role dengan level yang sama atau lebih tinggi dari authority kamu.',
        })
        return
      }
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const role =
            await tx.role.create({
              data: {
                companyId,
                name,
                description,
                level: levelRaw,
                isSystemRole: false,
              },
            })

          if (
            permissionIds.length > 0
          ) {
            await tx.rolePermission.createMany(
              {
                data: permissionIds.map(
                  (permissionId) => ({
                    roleId: role.id,
                    permissionId,
                  }),
                ),
              },
            )
          }

          return role
        },
      )

    const after =
      await getRoleSnapshot(
        result.id,
        companyId,
      )

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'CREATE',
      entity: 'Role',
      entityId: result.id,
      afterData: after,
      ipAddress:
        getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
    })

    res.status(201).json({
      success: true,
      message:
        'Role berhasil dibuat.',
      data: {
        role: after,
      },
    })
  } catch (error) {
    console.error(
      'Create role error:',
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
// UPDATE ROLE
// =====================================================

export async function updateRole(
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

    const roleId =
      Number(req.params.id)

    if (
      !Number.isSafeInteger(roleId) ||
      roleId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID role tidak valid.',
      })
      return
    }

    const existing =
      await getRoleSnapshot(
        roleId,
        companyId,
      )

    if (!existing) {
      res.status(404).json({
        success: false,
        message:
          'Role tidak ditemukan.',
      })
      return
    }

    if (
      isOwnerRole(existing)
    ) {
      res.status(403).json({
        success: false,
        message:
          'Role Owner adalah system role dan tidak dapat diubah.',
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

    const actorIsOwner =
      company?.ownerUserId === actor.id

    const data: {
      name?: string
      description?: string | null
      level?: number
    } = {}

    if (
      Object.prototype.hasOwnProperty.call(
        req.body ?? {},
        'name',
      )
    ) {
      const name =
        normalizeString(
          req.body?.name,
        )

      if (!name) {
        res.status(400).json({
          success: false,
          message:
            'Nama role tidak boleh kosong.',
        })
        return
      }

      const duplicate =
        await prisma.role.findFirst({
          where: {
            companyId,
            name,
            NOT: {
              id: roleId,
            },
          },
          select: {
            id: true,
          },
        })

      if (duplicate) {
        res.status(409).json({
          success: false,
          message:
            'Nama role sudah digunakan.',
        })
        return
      }

      data.name = name
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body ?? {},
        'description',
      )
    ) {
      data.description =
        normalizeString(
          req.body?.description,
        ) || null
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body ?? {},
        'level',
      )
    ) {
      const level =
        Number(req.body?.level)

      if (
        !Number.isInteger(level) ||
        level < 1 ||
        level > 999
      ) {
        res.status(400).json({
          success: false,
          message:
            'Level role harus antara 1 sampai 999.',
        })
        return
      }

      if (!actorIsOwner) {
        const actorRoles =
          await prisma.userRole.findMany({
            where: {
              userId: actor.id,
              role: {
                companyId,
              },
            },
            select: {
              role: {
                select: {
                  level: true,
                },
              },
            },
          })

        const highestActorLevel =
          Math.max(
            ...actorRoles.map(
              (item) =>
                item.role.level,
            ),
            0,
          )

        if (
          level >=
          highestActorLevel
        ) {
          res.status(403).json({
            success: false,
            message:
              'Kamu tidak dapat memberikan level role yang sama atau lebih tinggi dari authority kamu.',
          })
          return
        }
      }

      data.level = level
    }

    if (
      Object.keys(data).length === 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'Tidak ada data role yang diubah.',
      })
      return
    }

    const updated =
      await prisma.role.update({
        where: {
          id: roleId,
        },
        data,
      })

    const after =
      await getRoleSnapshot(
        updated.id,
        companyId,
      )

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'UPDATE',
      entity: 'Role',
      entityId: roleId,
      beforeData: existing,
      afterData: after,
      ipAddress:
        getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
    })

    res.status(200).json({
      success: true,
      message:
        'Role berhasil diperbarui.',
      data: {
        role: after,
      },
    })
  } catch (error) {
    console.error(
      'Update role error:',
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
// DELETE ROLE
// =====================================================

export async function deleteRole(
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

    const roleId =
      Number(req.params.id)

    if (
      !Number.isSafeInteger(roleId) ||
      roleId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID role tidak valid.',
      })
      return
    }

    const existing =
      await getRoleSnapshot(
        roleId,
        companyId,
      )

    if (!existing) {
      res.status(404).json({
        success: false,
        message:
          'Role tidak ditemukan.',
      })
      return
    }

    if (
      isOwnerRole(existing)
    ) {
      res.status(403).json({
        success: false,
        message:
          'Role Owner tidak dapat dihapus.',
      })
      return
    }

    const usage =
      await prisma.userRole.count({
        where: {
          roleId,
        },
      })

    if (usage > 0) {
      res.status(409).json({
        success: false,
        message:
          'Role masih digunakan oleh pengguna. Lepaskan role dari semua pengguna terlebih dahulu.',
      })
      return
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.rolePermission.deleteMany({
          where: {
            roleId,
          },
        })

        await tx.permissionDelegation.deleteMany({
          where: {
            targetRoleId: roleId,
          },
        })

        await tx.role.delete({
          where: {
            id: roleId,
          },
        })
      },
    )

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'DELETE',
      entity: 'Role',
      entityId: roleId,
      beforeData: existing,
      ipAddress:
        getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
    })

    res.status(200).json({
      success: true,
      message:
        'Role berhasil dihapus.',
    })
  } catch (error) {
    console.error(
      'Delete role error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}