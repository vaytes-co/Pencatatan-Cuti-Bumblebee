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