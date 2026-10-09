import type { Request, Response } from 'express'

import prisma from '../lib/db.js'

import type {
  AuthenticatedRequest,
} from '../middlewares/auth.middleware.js'

import { getCompanyId } from '../utils/tenant.js'

import auditService from '../services/audit.service.js'

import {
  canManageUser,
  canDelegatePermission,
} from '../services/authorization.service.js'

// =====================================================
// HELPER
// =====================================================

function getActor(req: Request) {
  const authenticatedRequest = req as AuthenticatedRequest

  if (!authenticatedRequest.user) {
    throw new Error('Authenticated user tidak tersedia.')
  }

  return authenticatedRequest.user
}

function getRequestIp(req: Request): string | null {
  return req.ip || null
}

function getRequestUserAgent(req: Request): string | null {
  return req.get('user-agent') || null
}

// =====================================================
// GET DELEGATIONS
// =====================================================

export async function getDelegations(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = getActor(req)
    const companyId = getCompanyId(
      req as AuthenticatedRequest,
    )

    const delegations =
      await prisma.permissionDelegation.findMany({
        where: {
          companyId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          companyId: true,
          delegatorUserId: true,
          delegateUserId: true,
          permissionId: true,
          targetUserId: true,
          targetRoleId: true,
          canDelegate: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,

          delegatorUser: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },

          delegateUser: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },

          permission: {
            select: {
              id: true,
              key: true,
              name: true,
              module: true,
              action: true,
            },
          },

          targetRole: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      })

    res.status(200).json({
      success: true,
      message: 'Data delegation berhasil diambil.',
      data: {
        delegations,
        actorUserId: actor.id,
      },
    })
  } catch (error) {
    console.error('Get delegations error:', error)

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// CREATE DELEGATION
// =====================================================

export async function createDelegation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = getActor(req)
    const companyId = getCompanyId(
      req as AuthenticatedRequest,
    )

    const {
      delegateUserId,
      permissionId,
      targetUserId,
      targetRoleId,
      canDelegate: requestedCanDelegate = false,
      expiresAt,
    } = req.body ?? {}

    // ---------------------------------------------------
    // VALIDASI TIPE DATA
    // ---------------------------------------------------

    if (typeof requestedCanDelegate !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'canDelegate harus berupa boolean.',
      })
      return
    }

    // ---------------------------------------------------
    // KONVERSI DAN VALIDASI ID
    // ---------------------------------------------------

    const delegateId = Number(delegateUserId)
    const permissionIdNumber = Number(permissionId)

    const targetUserIdNumber =
      targetUserId === null ||
      targetUserId === undefined ||
      targetUserId === ''
        ? null
        : Number(targetUserId)

    const targetRoleIdNumber =
      targetRoleId === null ||
      targetRoleId === undefined ||
      targetRoleId === ''
        ? null
        : Number(targetRoleId)

    if (
      !Number.isSafeInteger(delegateId) ||
      delegateId <= 0
    ) {
      res.status(400).json({
        success: false,
        message: 'Delegate user ID tidak valid.',
      })
      return
    }

    if (
      !Number.isSafeInteger(permissionIdNumber) ||
      permissionIdNumber <= 0
    ) {
      res.status(400).json({
        success: false,
        message: 'Permission ID tidak valid.',
      })
      return
    }

    if (
      targetUserIdNumber !== null &&
      (
        !Number.isSafeInteger(targetUserIdNumber) ||
        targetUserIdNumber <= 0
      )
    ) {
      res.status(400).json({
        success: false,
        message: 'Target user ID tidak valid.',
      })
      return
    }

    if (
      targetRoleIdNumber !== null &&
      (
        !Number.isSafeInteger(targetRoleIdNumber) ||
        targetRoleIdNumber <= 0
      )
    ) {
      res.status(400).json({
        success: false,
        message: 'Target role ID tidak valid.',
      })
      return
    }

    if (
      targetUserIdNumber !== null &&
      targetRoleIdNumber !== null
    ) {
      res.status(400).json({
        success: false,
        message:
          'Gunakan targetUserId atau targetRoleId, bukan keduanya sekaligus.',
      })
      return
    }

    // ---------------------------------------------------
    // VALIDASI DELEGATE USER
    // ---------------------------------------------------

    const delegateUser = await prisma.user.findFirst({
      where: {
        id: delegateId,
        companyId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
    })

    if (!delegateUser) {
      res.status(404).json({
        success: false,
        message: 'User penerima delegation tidak ditemukan.',
      })
      return
    }

    // ---------------------------------------------------
    // VALIDASI PERMISSION
    // ---------------------------------------------------

    const permission = await prisma.permission.findUnique({
      where: {
        id: permissionIdNumber,
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
        message: 'Permission tidak ditemukan.',
      })
      return
    }

    // ---------------------------------------------------
    // VALIDASI TARGET USER
    // ---------------------------------------------------

    if (targetUserIdNumber !== null) {
      const targetUser = await prisma.user.findFirst({
        where: {
          id: targetUserIdNumber,
          companyId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          username: true,
        },
      })

      if (!targetUser) {
        res.status(404).json({
          success: false,
          message: 'Target user tidak ditemukan.',
        })
        return
      }

      if (
        targetUser.id === actor.id ||
        targetUser.id === delegateUser.id
      ) {
        res.status(400).json({
          success: false,
          message:
            'Target delegation tidak boleh berupa diri sendiri atau delegate user.',
        })
        return
      }

      // Penerima harus memiliki authority atas target user.
      let canManageTarget: boolean

      try {
        canManageTarget = await canManageUser(
          delegateUser.id,
          targetUser.id,
          companyId,
        )
      } catch {
        res.status(403).json({
          success: false,
          message:
            'Target user tidak dapat dikelola oleh penerima delegation.',
        })
        return
      }

      if (!canManageTarget) {
        res.status(403).json({
          success: false,
          message:
            'Delegate user tidak memiliki authority terhadap target user tersebut.',
        })
        return
      }
    }

    // ---------------------------------------------------
    // VALIDASI TARGET ROLE
    // ---------------------------------------------------

    if (targetRoleIdNumber !== null) {
      const targetRole = await prisma.role.findFirst({
        where: {
          id: targetRoleIdNumber,
          companyId,
        },
        select: {
          id: true,
          name: true,
          level: true,
          isSystemRole: true,
        },
      })

      if (!targetRole) {
        res.status(404).json({
          success: false,
          message: 'Target role tidak ditemukan.',
        })
        return
      }

      if (
        targetRole.isSystemRole &&
        targetRole.name.toLowerCase() === 'owner'
      ) {
        res.status(403).json({
          success: false,
          message:
            'Delegation tidak boleh menargetkan role Owner.',
        })
        return
      }
    }

    // ---------------------------------------------------
    // DELEGATION AUTHORITY DAN SCOPE
    // ---------------------------------------------------

    let delegationAllowed: boolean

    try {
      delegationAllowed = await canDelegatePermission(
        actor.id,
        delegateUser.id,
        permission.id,
        companyId,
        targetUserIdNumber,
        targetRoleIdNumber,
      )
    } catch (error) {
      console.error(
        'Delegation authority check error:',
        error,
      )

      res.status(403).json({
        success: false,
        message:
          'Authority atau scope delegation tidak dapat diverifikasi.',
      })
      return
    }

    if (!delegationAllowed) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki authority atau scope yang sesuai untuk mendelegasikan permission ini.',
      })
      return
    }

    // ---------------------------------------------------
    // VALIDASI EXPIRATION
    // ---------------------------------------------------

    let parsedExpiresAt: Date | null = null

    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
      if (typeof expiresAt !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Tanggal expiration harus berupa string tanggal.',
        })
        return
      }

      const parsed = new Date(expiresAt)

      if (Number.isNaN(parsed.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Tanggal expiration tidak valid.',
        })
        return
      }

      if (parsed <= new Date()) {
        res.status(400).json({
          success: false,
          message:
            'Tanggal expiration harus berada di masa depan.',
        })
        return
      }

      parsedExpiresAt = parsed
    }

    // ---------------------------------------------------
    // CREATE DELEGATION
    // ---------------------------------------------------

    const delegation =
      await prisma.permissionDelegation.create({
        data: {
          companyId,
          delegatorUserId: actor.id,
          delegateUserId: delegateUser.id,
          permissionId: permission.id,
          targetUserId: targetUserIdNumber,
          targetRoleId: targetRoleIdNumber,

          // Jangan gunakan Boolean(requestedCanDelegate).
          // Nilai sudah divalidasi sebagai boolean di atas.
          canDelegate: requestedCanDelegate,

          expiresAt: parsedExpiresAt,
        },
        select: {
          id: true,
          companyId: true,
          delegatorUserId: true,
          delegateUserId: true,
          permissionId: true,
          targetUserId: true,
          targetRoleId: true,
          canDelegate: true,
          expiresAt: true,
          createdAt: true,

          permission: {
            select: {
              id: true,
              key: true,
              name: true,
            },
          },
        },
      })

    // ---------------------------------------------------
    // AUDIT LOG
    // ---------------------------------------------------

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'CREATE',
      entity: 'PermissionDelegation',
      entityId: delegation.id,
      afterData: delegation,
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
    })

    res.status(201).json({
      success: true,
      message: 'Permission delegation berhasil dibuat.',
      data: {
        delegation,
      },
    })
  } catch (error) {
    console.error('Create delegation error:', error)

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// DELETE DELEGATION
// =====================================================

export async function deleteDelegation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = getActor(req)
    const companyId = getCompanyId(
      req as AuthenticatedRequest,
    )

    const delegationId = Number(req.params.id)

    if (
      !Number.isSafeInteger(delegationId) ||
      delegationId <= 0
    ) {
      res.status(400).json({
        success: false,
        message: 'Delegation ID tidak valid.',
      })
      return
    }

    const delegation =
      await prisma.permissionDelegation.findFirst({
        where: {
          id: delegationId,
          companyId,
        },
        select: {
          id: true,
          delegatorUserId: true,
          delegateUserId: true,
          permissionId: true,
          targetUserId: true,
          targetRoleId: true,
          canDelegate: true,
          expiresAt: true,
          createdAt: true,
        },
      })

    if (!delegation) {
      res.status(404).json({
        success: false,
        message: 'Delegation tidak ditemukan.',
      })
      return
    }

    // Delegator asli atau Owner boleh menghapus delegasi.
    if (
      delegation.delegatorUserId !== actor.id &&
      !actor.isOwner
    ) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki authority untuk menghapus delegation ini.',
      })
      return
    }

    await prisma.permissionDelegation.delete({
      where: {
        id: delegation.id,
      },
    })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'DELETE',
      entity: 'PermissionDelegation',
      entityId: delegation.id,
      beforeData: delegation,
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
    })

    res.status(200).json({
      success: true,
      message: 'Permission delegation berhasil dihapus.',
    })
  } catch (error) {
    console.error('Delete delegation error:', error)

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}