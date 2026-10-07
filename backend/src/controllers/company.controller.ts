import type {
  Request,
  Response,
} from 'express'

import bcrypt from 'bcrypt'

import prisma from '../lib/db.js'
import { PERMISSIONS } from '../config/permissions.js'

function normalizeString(
  value: unknown,
): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

export async function createCompany(
  req: Request,
  res: Response,
) {
  try {
    const code = normalizeString(
      req.body?.code,
    )

    const name = normalizeString(
      req.body?.name,
    )

    const legalName = normalizeString(
      req.body?.legalName,
    )

    const email = normalizeString(
      req.body?.email,
    )

    const phone = normalizeString(
      req.body?.phone,
    )

    const address = normalizeString(
      req.body?.address,
    )

    const timezone =
      normalizeString(
        req.body?.timezone,
      ) || 'Asia/Jakarta'

    const ownerName =
      normalizeString(
        req.body?.ownerName,
      )

    const ownerUsername =
      normalizeString(
        req.body?.ownerUsername,
      )

    const ownerPassword =
      typeof req.body?.ownerPassword ===
      'string'
        ? req.body.ownerPassword
        : ''

    if (!code) {
      return res.status(400).json({
        success: false,
        message:
          'Kode perusahaan wajib diisi.',
      })
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message:
          'Nama perusahaan wajib diisi.',
      })
    }

    if (!ownerName) {
      return res.status(400).json({
        success: false,
        message:
          'Nama Owner wajib diisi.',
      })
    }

    if (!ownerUsername) {
      return res.status(400).json({
        success: false,
        message:
          'Username Owner wajib diisi.',
      })
    }

    if (!ownerPassword) {
      return res.status(400).json({
        success: false,
        message:
          'Password Owner wajib diisi.',
      })
    }

    if (ownerPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          'Password Owner minimal 8 karakter.',
      })
    }

    const existingCompany =
      await prisma.company.findUnique({
        where: {
          code,
        },
        select: {
          id: true,
        },
      })

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message:
          'Kode perusahaan sudah digunakan.',
      })
    }

    const existingUsername =
      await prisma.user.findUnique({
        where: {
          username: ownerUsername,
        },
        select: {
          id: true,
        },
      })

    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message:
          'Username Owner sudah digunakan.',
      })
    }

    const passwordHash =
      await bcrypt.hash(
        ownerPassword,
        12,
      )

    const permissionKeys =
      PERMISSIONS.map(
        (permission) =>
          permission.key,
      )

    const permissions =
      await prisma.permission.findMany({
        where: {
          key: {
            in: permissionKeys,
          },
        },
        select: {
          id: true,
          key: true,
        },
      })

    if (
      permissions.length !==
      permissionKeys.length
    ) {
      return res.status(500).json({
        success: false,
        message:
          'Data permission company belum lengkap. Jalankan seed terlebih dahulu.',
      })
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const company =
            await tx.company.create({
              data: {
                code,
                name,
                legalName:
                  legalName || null,
                email:
                  email || null,
                phone:
                  phone || null,
                address:
                  address || null,
                timezone,
                status: 'ACTIVE',
              },
            })

          const owner =
            await tx.user.create({
              data: {
                companyId:
                  company.id,
                name: ownerName,
                username:
                  ownerUsername,
                passwordHash,
                status: 'ACTIVE',
              },
            })

          const ownerRole =
            await tx.role.create({
              data: {
                companyId:
                  company.id,
                name: 'Owner',
                description:
                  'Pemilik dan pengelola utama perusahaan.',
                level: 1000,
                isSystemRole: true,
              },
            })

          await tx.userRole.create({
            data: {
              userId: owner.id,
              roleId: ownerRole.id,
            },
          })

          await tx.rolePermission.createMany({
            data: permissions.map(
              (permission) => ({
                roleId:
                  ownerRole.id,
                permissionId:
                  permission.id,
              }),
            ),
          })

          const updatedCompany =
            await tx.company.update({
              where: {
                id: company.id,
              },
              data: {
                ownerUserId:
                  owner.id,
              },
              select: {
                id: true,
                code: true,
                name: true,
                legalName: true,
                email: true,
                phone: true,
                address: true,
                timezone: true,
                status: true,
                ownerUserId: true,
                createdAt: true,
                updatedAt: true,
              },
            })

          return {
            company:
              updatedCompany,
            owner: {
              id: owner.id,
              name: owner.name,
              username:
                owner.username,
              status: owner.status,
            },
            role: {
              id: ownerRole.id,
              name: ownerRole.name,
              level:
                ownerRole.level,
              isSystemRole:
                ownerRole.isSystemRole,
            },
            permissionCount:
              permissions.length,
          }
        },
      )

    return res.status(201).json({
      success: true,
      message:
        'Perusahaan berhasil dibuat.',
      data: result,
    })
  } catch (error) {
    console.error(
      'Create company error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}