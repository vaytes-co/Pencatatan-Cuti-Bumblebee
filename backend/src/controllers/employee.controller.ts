import type {
  Request,
  Response,
} from 'express'

import prisma from '../lib/db.js'

import type {
  AuthenticatedRequest,
} from '../middlewares/auth.middleware.js'

import { getCompanyId } from '../utils/tenant.js'

export async function getEmployees(
  req: Request,
  res: Response,
) {
  try {
    const authenticatedRequest =
      req as AuthenticatedRequest

    const companyId =
      getCompanyId(authenticatedRequest)

    // -----------------------------------------------------
    // Pagination
    // -----------------------------------------------------

    const pageRaw = Number(req.query.page ?? 1)
    const limitRaw = Number(req.query.limit ?? 10)

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

    const skip = (page - 1) * limit

    // -----------------------------------------------------
    // Search
    // -----------------------------------------------------

    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
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
                employeeCode: {
                  contains: search,
                },
              },
            ],
          }
        : {}),
    }

    // -----------------------------------------------------
    // Ambil data + total
    // -----------------------------------------------------

    const [employees, total] =
      await Promise.all([
        prisma.employee.findMany({
          where,
          skip,
          take: limit,

          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },

            position: {
              select: {
                id: true,
                name: true,
              },
            },
          },

          orderBy: [
            {
              name: 'asc',
            },
          ],
        }),

        prisma.employee.count({
          where,
        }),
      ])

    const totalPages =
      Math.ceil(total / limit)

    return res.status(200).json({
      success: true,

      message:
        'Data karyawan berhasil diambil.',

      data: {
        employees,

        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    })
  } catch (error) {
    console.error(
      'Get employees error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}

export async function createEmployee(
  req: Request,
  res: Response,
) {
  try {
    const authenticatedRequest =
      req as AuthenticatedRequest

    const companyId =
      getCompanyId(authenticatedRequest)

    // -----------------------------------------------------
    // Ambil input
    // -----------------------------------------------------

    const {
      employeeCode,
      name,
      departmentId,
      positionId,
      employmentDate,
      status,
    } = req.body ?? {}

    // -----------------------------------------------------
    // Validasi input wajib
    // -----------------------------------------------------

    if (
      typeof name !== 'string' ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Nama karyawan wajib diisi.',
      })
    }

    if (
      typeof employmentDate !== 'string' ||
      !employmentDate.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Tanggal masuk karyawan wajib diisi.',
      })
    }

    // -----------------------------------------------------
    // Validasi employeeCode
    // -----------------------------------------------------

    const normalizedEmployeeCode =
      typeof employeeCode === 'string' &&
      employeeCode.trim()
        ? employeeCode.trim()
        : null

    // -----------------------------------------------------
    // Validasi tanggal
    // -----------------------------------------------------

    const parsedEmploymentDate =
      new Date(employmentDate)

    if (
      Number.isNaN(
        parsedEmploymentDate.getTime(),
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Format tanggal masuk tidak valid.',
      })
    }

    // -----------------------------------------------------
    // Validasi department
    // -----------------------------------------------------

    let normalizedDepartmentId:
      number | null = null

    if (
      departmentId !== undefined &&
      departmentId !== null &&
      departmentId !== ''
    ) {
      const parsedDepartmentId =
        Number(departmentId)

      if (
        !Number.isSafeInteger(
          parsedDepartmentId,
        ) ||
        parsedDepartmentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Department tidak valid.',
        })
      }

      normalizedDepartmentId =
        parsedDepartmentId
    }

    // -----------------------------------------------------
    // Validasi position
    // -----------------------------------------------------

    let normalizedPositionId:
      number | null = null

    if (
      positionId !== undefined &&
      positionId !== null &&
      positionId !== ''
    ) {
      const parsedPositionId =
        Number(positionId)

      if (
        !Number.isSafeInteger(
          parsedPositionId,
        ) ||
        parsedPositionId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Position tidak valid.',
        })
      }

      normalizedPositionId =
        parsedPositionId
    }

    // -----------------------------------------------------
    // Validasi status
    // -----------------------------------------------------

    const allowedStatuses = [
      'ACTIVE',
      'INACTIVE',
      'RESIGNED',
      'TERMINATED',
    ] as const

    const normalizedStatus =
      status === undefined ||
      status === null ||
      status === ''
        ? 'ACTIVE'
        : status

    if (
      typeof normalizedStatus !==
        'string' ||
      !allowedStatuses.includes(
        normalizedStatus as
          (typeof allowedStatuses)[number],
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Status karyawan tidak valid.',
      })
    }

    // -----------------------------------------------------
    // Pastikan department milik company yang sama
    // -----------------------------------------------------

    if (normalizedDepartmentId !== null) {
      const department =
        await prisma.department.findFirst({
          where: {
            id: normalizedDepartmentId,
            companyId,
          },
          select: {
            id: true,
          },
        })

      if (!department) {
        return res.status(400).json({
          success: false,
          message:
            'Department tidak ditemukan di perusahaan ini.',
        })
      }
    }

    // -----------------------------------------------------
    // Pastikan position milik company yang sama
    // -----------------------------------------------------

    if (normalizedPositionId !== null) {
      const position =
        await prisma.position.findFirst({
          where: {
            id: normalizedPositionId,
            companyId,
          },
          select: {
            id: true,
          },
        })

      if (!position) {
        return res.status(400).json({
          success: false,
          message:
            'Position tidak ditemukan di perusahaan ini.',
        })
      }
    }

    // -----------------------------------------------------
    // Cek employeeCode
    // -----------------------------------------------------

    if (normalizedEmployeeCode) {
      const existingEmployee =
        await prisma.employee.findFirst({
          where: {
            companyId,
            employeeCode:
              normalizedEmployeeCode,
          },
          select: {
            id: true,
          },
        })

      if (existingEmployee) {
        return res.status(409).json({
          success: false,
          message:
            'Kode karyawan sudah digunakan di perusahaan ini.',
        })
      }
    }

    // -----------------------------------------------------
    // Buat employee
    // -----------------------------------------------------

    const employee =
      await prisma.employee.create({
        data: {
          companyId,

          employeeCode:
            normalizedEmployeeCode,

          name: name.trim(),

          departmentId:
            normalizedDepartmentId,

          positionId:
            normalizedPositionId,

          employmentDate:
            parsedEmploymentDate,

          status:
            normalizedStatus as
              | 'ACTIVE'
              | 'INACTIVE'
              | 'RESIGNED'
              | 'TERMINATED',
        },

        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },

          position: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

    return res.status(201).json({
      success: true,
      message:
        'Karyawan berhasil ditambahkan.',
      data: {
        employee,
      },
    })
  } catch (error) {
    console.error(
      'Create employee error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Terjadi kesalahan pada server.',
    })
  }
}