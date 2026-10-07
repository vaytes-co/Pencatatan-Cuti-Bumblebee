import type { Request, Response } from 'express'

import prisma from '../lib/db.js'

function normalizeOptionalString(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()

  return normalized || null
}

export async function getCompanies(
  _req: Request,
  res: Response,
): Promise<void> {
  const companies = await prisma.company.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      ownerUserId: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users: true,
          employees: true,
          companyModules: true,
        },
      },
    },
  })

  res.status(200).json({
    success: true,
    data: companies,
  })
}

export async function getCompanyById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const companyId = Number(req.params.id)

    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0
    ) {
      res.status(400).json({
        success: false,
        message: 'ID perusahaan tidak valid.',
      })
      return
    }

    const company =
      await prisma.company.findUnique({
        where: {
          id: companyId,
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

          ownerUser: {
            select: {
              id: true,
              name: true,
              username: true,
              status: true,
            },
          },

          _count: {
            select: {
              users: true,
              employees: true,
              companyModules: true,
            },
          },

          companyModules: {
            select: {
              id: true,
              companyId: true,
              moduleId: true,
              status: true,
              activatedAt: true,
              createdAt: true,
              updatedAt: true,

              module: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                  description: true,
                },
              },
            },
            orderBy: {
              module: {
                name: 'asc',
              },
            },
          },
        },
      })

    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Perusahaan tidak ditemukan.',
      })
      return
    }

    res.status(200).json({
      success: true,
      data: company,
    })
  } catch (error) {
    console.error(
      'Get company detail error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

export async function updateCompany(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const companyId = Number(req.params.id)

    // --------------------------------------------------
    // 1. Validasi ID
    // --------------------------------------------------

    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0
    ) {
      res.status(400).json({
        success: false,
        message: 'ID perusahaan tidak valid.',
      })
      return
    }

    // --------------------------------------------------
    // 2. Cari company terlebih dahulu
    // --------------------------------------------------

    const existingCompany =
      await prisma.company.findUnique({
        where: {
          id: companyId,
        },
        select: {
          id: true,
        },
      })

    if (!existingCompany) {
      res.status(404).json({
        success: false,
        message:
          'Perusahaan tidak ditemukan.',
      })
      return
    }

    // --------------------------------------------------
    // 3. Pastikan request body berupa object
    // --------------------------------------------------

    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body)
    ) {
      res.status(400).json({
        success: false,
        message:
          'Data perusahaan tidak valid.',
      })
      return
    }

    // --------------------------------------------------
    // 4. Siapkan data update
    // --------------------------------------------------

    const updateData: {
      name?: string
      legalName?: string | null
      email?: string | null
      phone?: string | null
      address?: string | null
      timezone?: string
    } = {}

    // --------------------------------------------------
    // 5. NAME
    // --------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        'name',
      )
    ) {
      if (
        typeof req.body.name !==
        'string'
      ) {
        res.status(400).json({
          success: false,
          message:
            'Nama perusahaan harus berupa teks.',
        })
        return
      }

      const name =
        req.body.name.trim()

      if (!name) {
        res.status(400).json({
          success: false,
          message:
            'Nama perusahaan tidak boleh kosong.',
        })
        return
      }

      updateData.name = name
    }

    // --------------------------------------------------
    // 6. LEGAL NAME
    // --------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        'legalName',
      )
    ) {
      if (
        req.body.legalName !==
          null &&
        typeof req.body.legalName !==
          'string'
      ) {
        res.status(400).json({
          success: false,
          message:
            'Legal name harus berupa teks.',
        })
        return
      }

      updateData.legalName =
        normalizeOptionalString(
          req.body.legalName,
        )
    }

    // --------------------------------------------------
    // 7. EMAIL
    // --------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        'email',
      )
    ) {
      if (
        req.body.email !== null &&
        typeof req.body.email !==
          'string'
      ) {
        res.status(400).json({
          success: false,
          message:
            'Email harus berupa teks.',
        })
        return
      }

      updateData.email =
        normalizeOptionalString(
          req.body.email,
        )
    }

    // --------------------------------------------------
    // 8. PHONE
    // --------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        'phone',
      )
    ) {
      if (
        req.body.phone !== null &&
        typeof req.body.phone !==
          'string'
      ) {
        res.status(400).json({
          success: false,
          message:
            'Nomor telepon harus berupa teks.',
        })
        return
      }

      updateData.phone =
        normalizeOptionalString(
          req.body.phone,
        )
    }

    // --------------------------------------------------
    // 9. ADDRESS
    // --------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        'address',
      )
    ) {
      if (
        req.body.address !== null &&
        typeof req.body.address !==
          'string'
      ) {
        res.status(400).json({
          success: false,
          message:
            'Alamat harus berupa teks.',
        })
        return
      }

      updateData.address =
        normalizeOptionalString(
          req.body.address,
        )
    }

    // --------------------------------------------------
    // 10. TIMEZONE
    // --------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        'timezone',
      )
    ) {
      if (
        typeof req.body.timezone !==
        'string'
      ) {
        res.status(400).json({
          success: false,
          message:
            'Timezone harus berupa teks.',
        })
        return
      }

      const timezone =
        req.body.timezone.trim()

      if (!timezone) {
        res.status(400).json({
          success: false,
          message:
            'Timezone tidak boleh kosong.',
        })
        return
      }

      updateData.timezone =
        timezone
    }

    // --------------------------------------------------
    // 11. Pastikan ada sesuatu yang diubah
    // --------------------------------------------------

    if (
      Object.keys(updateData).length ===
      0
    ) {
      res.status(400).json({
        success: false,
        message:
          'Tidak ada data perusahaan yang perlu diperbarui.',
      })
      return
    }

    // --------------------------------------------------
    // 12. Update company
    // --------------------------------------------------

    const company =
      await prisma.company.update({
        where: {
          id: companyId,
        },
        data: updateData,
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

    res.status(200).json({
      success: true,
      message:
        'Informasi perusahaan berhasil diperbarui.',
      data: company,
    })
  } catch (error) {
    console.error(
      'Update company error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}