import type { Request, Response } from 'express'

import prisma from '../lib/db.js'
import auditService from '../services/audit.service.js'

type PlatformRequest = Request & {
  user?: {
    id: number
  }
}

function getPlatformActorId(
  req: Request,
): number {
  const platformRequest =
    req as PlatformRequest

  if (
    !platformRequest.user ||
    !Number.isSafeInteger(
      platformRequest.user.id,
    ) ||
    platformRequest.user.id <= 0
  ) {
    throw new Error(
      'Platform actor tidak valid.',
    )
  }

  return platformRequest.user.id
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
  const companies =
    await prisma.company.findMany({
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
    const companyId = Number(
      req.params.id,
    )

    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID perusahaan tidak valid.',
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
        message:
          'Perusahaan tidak ditemukan.',
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
    const companyId = Number(
      req.params.id,
    )

    // --------------------------------------------------
    // 1. Validasi ID
    // --------------------------------------------------

    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID perusahaan tidak valid.',
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
        req.body.legalName !== null &&
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

    // --------------------------------------------------
    // 13. Audit
    // --------------------------------------------------

    await auditService.log({
      actorType: 'PLATFORM',
      actorId:
        getPlatformActorId(req),
      companyId,
      action: 'UPDATE',
      entity: 'Company',
      entityId: companyId,
      beforeData: existingCompany,
      afterData: company,
      ipAddress: getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
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

export async function suspendCompany(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const companyId = Number(
      req.params.id,
    )

    // --------------------------------------------------
    // 1. Validasi ID
    // --------------------------------------------------

    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID perusahaan tidak valid.',
      })

      return
    }

    // --------------------------------------------------
    // 2. Cari company
    // --------------------------------------------------

    const company =
      await prisma.company.findUnique({
        where: {
          id: companyId,
        },

        select: {
          id: true,
          code: true,
          name: true,
          status: true,
        },
      })

    if (!company) {
      res.status(404).json({
        success: false,
        message:
          'Perusahaan tidak ditemukan.',
      })

      return
    }

    // --------------------------------------------------
    // 3. Pastikan belum suspended
    // --------------------------------------------------

    if (
      company.status === 'SUSPENDED'
    ) {
      res.status(400).json({
        success: false,
        message:
          'Perusahaan sudah dalam status suspended.',
      })

      return
    }

    // --------------------------------------------------
    // 4. Suspend company
    // --------------------------------------------------

    const updatedCompany =
      await prisma.company.update({
        where: {
          id: companyId,
        },

        data: {
          status: 'SUSPENDED',
        },

        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          ownerUserId: true,
          updatedAt: true,
        },
      })

    // --------------------------------------------------
    // 5. Audit
    // --------------------------------------------------

    await auditService.log({
      actorType: 'PLATFORM',
      actorId:
        getPlatformActorId(req),
      companyId,
      action: 'SUSPEND',
      entity: 'Company',
      entityId: companyId,
      beforeData: company,
      afterData: updatedCompany,
      ipAddress: getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
    })

    // --------------------------------------------------
    // 6. Response
    // --------------------------------------------------

    res.status(200).json({
      success: true,
      message:
        'Perusahaan berhasil dinonaktifkan.',
      data: updatedCompany,
    })
  } catch (error) {
    console.error(
      'Suspend company error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

export async function activateCompany(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const companyId = Number(
      req.params.id,
    )

    // --------------------------------------------------
    // 1. Validasi ID
    // --------------------------------------------------

    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID perusahaan tidak valid.',
      })

      return
    }

    // --------------------------------------------------
    // 2. Cari company
    // --------------------------------------------------

    const company =
      await prisma.company.findUnique({
        where: {
          id: companyId,
        },

        select: {
          id: true,
          code: true,
          name: true,
          status: true,
        },
      })

    if (!company) {
      res.status(404).json({
        success: false,
        message:
          'Perusahaan tidak ditemukan.',
      })

      return
    }

    // --------------------------------------------------
    // 3. Pastikan belum active
    // --------------------------------------------------

    if (
      company.status === 'ACTIVE'
    ) {
      res.status(400).json({
        success: false,
        message:
          'Perusahaan sudah dalam status active.',
      })

      return
    }

    // --------------------------------------------------
    // 4. Activate company
    // --------------------------------------------------

    const updatedCompany =
      await prisma.company.update({
        where: {
          id: companyId,
        },

        data: {
          status: 'ACTIVE',
        },

        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          ownerUserId: true,
          updatedAt: true,
        },
      })

    // --------------------------------------------------
    // 5. Audit
    // --------------------------------------------------

    await auditService.log({
      actorType: 'PLATFORM',
      actorId:
        getPlatformActorId(req),
      companyId,
      action: 'ACTIVATE',
      entity: 'Company',
      entityId: companyId,
      beforeData: company,
      afterData: updatedCompany,
      ipAddress: getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
    })

    // --------------------------------------------------
    // 6. Response
    // --------------------------------------------------

    res.status(200).json({
      success: true,
      message:
        'Perusahaan berhasil diaktifkan.',
      data: updatedCompany,
    })
  } catch (error) {
    console.error(
      'Activate company error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

export async function getCompanyModules(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const companyId = Number(
      req.params.id,
    )

    // --------------------------------------------------
    // 1. Validasi company ID
    // --------------------------------------------------

    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID perusahaan tidak valid.',
      })

      return
    }

    // --------------------------------------------------
    // 2. Pastikan company ada
    // --------------------------------------------------

    const company =
      await prisma.company.findUnique({
        where: {
          id: companyId,
        },

        select: {
          id: true,
          code: true,
          name: true,
        },
      })

    if (!company) {
      res.status(404).json({
        success: false,
        message:
          'Perusahaan tidak ditemukan.',
      })

      return
    }

    // --------------------------------------------------
    // 3. Ambil seluruh module catalog
    // --------------------------------------------------

    const modules =
      await prisma.module.findMany({
        orderBy: {
          name: 'asc',
        },

        select: {
          id: true,
          key: true,
          name: true,
          description: true,

          companyModules: {
            where: {
              companyId,
            },

            select: {
              id: true,
              status: true,
              activatedAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      })

    // --------------------------------------------------
    // 4. Normalisasi response
    // --------------------------------------------------

    const data = modules.map(
      (module) => {
        const companyModule =
          module.companyModules[0] ??
          null

        return {
          id: module.id,
          key: module.key,
          name: module.name,
          description:
            module.description,

          status:
            companyModule?.status ??
            'INACTIVE',

          companyModuleId:
            companyModule?.id ?? null,

          activatedAt:
            companyModule?.activatedAt ??
            null,

          createdAt:
            companyModule?.createdAt ??
            null,

          updatedAt:
            companyModule?.updatedAt ??
            null,
        }
      },
    )

    res.status(200).json({
      success: true,
      data: {
        company,
        modules: data,
      },
    })
  } catch (error) {
    console.error(
      'Get company modules error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

export async function activateCompanyModule(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const companyId = Number(
      req.params.id,
    )

    const moduleId = Number(
      req.params.moduleId,
    )

    // --------------------------------------------------
    // 1. Validasi ID
    // --------------------------------------------------

    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID perusahaan tidak valid.',
      })

      return
    }

    if (
      !Number.isSafeInteger(moduleId) ||
      moduleId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID module tidak valid.',
      })

      return
    }

    // --------------------------------------------------
    // 2. Pastikan company ada
    // --------------------------------------------------

    const company =
      await prisma.company.findUnique({
        where: {
          id: companyId,
        },

        select: {
          id: true,
          code: true,
          name: true,
        },
      })

    if (!company) {
      res.status(404).json({
        success: false,
        message:
          'Perusahaan tidak ditemukan.',
      })

      return
    }

    // --------------------------------------------------
    // 3. Pastikan module ada
    // --------------------------------------------------

    const module =
      await prisma.module.findUnique({
        where: {
          id: moduleId,
        },

        select: {
          id: true,
          key: true,
          name: true,
          description: true,
        },
      })

    if (!module) {
      res.status(404).json({
        success: false,
        message:
          'Module tidak ditemukan.',
      })

      return
    }

    // --------------------------------------------------
    // 4. Cek status module untuk company
    // --------------------------------------------------

    const existingCompanyModule =
      await prisma.companyModule.findUnique(
        {
          where: {
            companyId_moduleId: {
              companyId,
              moduleId,
            },
          },

          select: {
            id: true,
            status: true,
          },
        },
      )

    if (
      existingCompanyModule?.status ===
      'ACTIVE'
    ) {
      res.status(400).json({
        success: false,
        message:
          'Module sudah aktif untuk perusahaan ini.',
      })

      return
    }

    // --------------------------------------------------
    // 5. Activate / create CompanyModule
    // --------------------------------------------------

    const companyModule =
      await prisma.companyModule.upsert({
        where: {
          companyId_moduleId: {
            companyId,
            moduleId,
          },
        },

        create: {
          companyId,
          moduleId,
          status: 'ACTIVE',
          activatedAt: new Date(),
        },

        update: {
          status: 'ACTIVE',
          activatedAt: new Date(),
        },

        select: {
          id: true,
          companyId: true,
          moduleId: true,
          status: true,
          activatedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      })

    // --------------------------------------------------
    // 6. Audit
    // --------------------------------------------------

    await auditService.log({
      actorType: 'PLATFORM',
      actorId:
        getPlatformActorId(req),
      companyId,
      action: 'ACTIVATE',
      entity: 'CompanyModule',
      entityId: companyModule.id,
      beforeData:
        existingCompanyModule,
      afterData: companyModule,
      ipAddress: getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
    })

    // --------------------------------------------------
    // 7. Response
    // --------------------------------------------------

    res.status(200).json({
      success: true,
      message:
        'Module berhasil diaktifkan untuk perusahaan.',
      data: {
        company,
        module,
        companyModule,
      },
    })
  } catch (error) {
    console.error(
      'Activate company module error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

export async function deactivateCompanyModule(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const companyId = Number(
      req.params.id,
    )

    const moduleId = Number(
      req.params.moduleId,
    )

    // --------------------------------------------------
    // 1. Validasi ID
    // --------------------------------------------------

    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID perusahaan tidak valid.',
      })

      return
    }

    if (
      !Number.isSafeInteger(moduleId) ||
      moduleId <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'ID module tidak valid.',
      })

      return
    }

    // --------------------------------------------------
    // 2. Cari CompanyModule
    // --------------------------------------------------

    const companyModule =
      await prisma.companyModule.findUnique(
        {
          where: {
            companyId_moduleId: {
              companyId,
              moduleId,
            },
          },

          select: {
            id: true,
            companyId: true,
            moduleId: true,
            status: true,
          },
        },
      )

    if (!companyModule) {
      res.status(404).json({
        success: false,
        message:
          'Module belum dikonfigurasi untuk perusahaan ini.',
      })

      return
    }

    // --------------------------------------------------
    // 3. Pastikan belum inactive
    // --------------------------------------------------

    if (
      companyModule.status ===
      'INACTIVE'
    ) {
      res.status(400).json({
        success: false,
        message:
          'Module sudah tidak aktif untuk perusahaan ini.',
      })

      return
    }

    // --------------------------------------------------
    // 4. Deactivate
    // --------------------------------------------------

    const updatedCompanyModule =
      await prisma.companyModule.update({
        where: {
          id: companyModule.id,
        },

        data: {
          status: 'INACTIVE',
          activatedAt: null,
        },

        select: {
          id: true,
          companyId: true,
          moduleId: true,
          status: true,
          activatedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      })

    // --------------------------------------------------
    // 5. Audit
    // --------------------------------------------------

    await auditService.log({
      actorType: 'PLATFORM',
      actorId:
        getPlatformActorId(req),
      companyId,
      action: 'DEACTIVATE',
      entity: 'CompanyModule',
      entityId:
        updatedCompanyModule.id,
      beforeData: companyModule,
      afterData:
        updatedCompanyModule,
      ipAddress: getRequestIp(req),
      userAgent:
        getRequestUserAgent(req),
    })

    // --------------------------------------------------
    // 6. Response
    // --------------------------------------------------

    res.status(200).json({
      success: true,
      message:
        'Module berhasil dinonaktifkan untuk perusahaan.',
      data: updatedCompanyModule,
    })
  } catch (error) {
    console.error(
      'Deactivate company module error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}