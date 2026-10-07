import type { Request, Response } from 'express'

import prisma from '../lib/db.js'

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