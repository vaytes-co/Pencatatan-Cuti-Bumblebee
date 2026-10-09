import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js'
import prisma from '../lib/db.js'
import auditService from '../services/audit.service.js'
import { getCompanyId } from '../utils/tenant.js'

import {
  ACTIVE_LEAVE_STATUSES,
  addDays,
  dateOnly,
  formatDate,
  getAnnualLeaveBalance,
  getCompletedYears,
  getLeavePeriod,
  getLeaveSettings,
  getWorkingDays,
  parseDateOnly,
} from '../services/leave.service.js'

const leaveInclude = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      name: true,
      employmentDate: true,
      status: true,
      department: {
        select: { id: true, name: true },
      },
      position: {
        select: { id: true, name: true },
      },
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      username: true,
    },
  },
  approval: {
    include: {
      managementApprovedBy: {
        select: { id: true, name: true, username: true },
      },
      ownerApprovedBy: {
        select: { id: true, name: true, username: true },
      },
      exceptionApprovedBy: {
        select: { id: true, name: true, username: true },
      },
    },
  },
} as const

function actorOf(req: Request) {
  const actor = (req as AuthenticatedRequest).user

  if (!actor) {
    throw new Error('Authenticated user tidak tersedia.')
  }

  return actor
}

function companyOf(req: Request) {
  return getCompanyId(req as AuthenticatedRequest)
}

function ipOf(req: Request) {
  return req.ip || null
}

function userAgentOf(req: Request) {
  return req.get('user-agent') || null
}

function canSeeAllLeaves(
  actor: ReturnType<typeof actorOf>,
) {
  return (
    actor.isOwner ||
    actor.permissions.includes('leave.approve_management') ||
    actor.permissions.includes('leave.approve_owner')
  )
}

function isValidId(value: unknown): number | null {
  const id = typeof value === 'number' ? value : Number(value)

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null
}

function parseDecision(
  value: unknown,
): 'APPROVED' | 'REJECTED' | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toUpperCase()

  if (
    normalized === 'APPROVE' ||
    normalized === 'APPROVED'
  ) {
    return 'APPROVED'
  }

  if (
    normalized === 'REJECT' ||
    normalized === 'REJECTED'
  ) {
    return 'REJECTED'
  }

  return null
}

function dateRangeOverlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
) {
  return (
    dateOnly(aStart) <= dateOnly(bEnd) &&
    dateOnly(aEnd) >= dateOnly(bStart)
  )
}

async function isAdjacentToHoliday(
  companyId: number,
  startDate: Date,
  endDate: Date,
) {
  const from = addDays(startDate, -1)
  const to = addDays(endDate, 1)

  const holidays = await prisma.holiday.findMany({
    where: {
      companyId,
      isActive: true,
      date: {
        gte: from,
        lte: to,
      },
    },
    select: {
      date: true,
    },
  })

  return holidays.some((holiday) => {
    const date = dateOnly(holiday.date)

    return (
      date.getTime() === from.getTime() ||
      date.getTime() === to.getTime()
    )
  })
}

async function validateLeaveRequest(input: {
  companyId: number
  employeeId: number
  startDate: Date
  endDate: Date
  type: 'ANNUAL' | 'MARRIAGE' | 'OTHER'
  excludeLeaveId?: number
}) {
  const {
    companyId,
    employeeId,
    startDate,
    endDate,
    type,
    excludeLeaveId,
  } = input

  if (dateOnly(endDate) < dateOnly(startDate)) {
    return {
      error: 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
      status: 400 as const,
    }
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      employmentDate: true,
    },
  })

  if (!employee) {
    return {
      error: 'Karyawan tidak ditemukan atau tidak aktif.',
      status: 404 as const,
    }
  }

  if (
    getCompletedYears(employee.employmentDate, startDate) < 1
  ) {
    return {
      error:
        'Karyawan belum mencapai masa kerja 1 tahun sehingga belum memiliki hak cuti.',
      status: 400 as const,
    }
  }

  const settings = await getLeaveSettings(companyId)
  const today = dateOnly(new Date())
  const earliestDate = addDays(
    today,
    settings.minDaysBeforeLeave,
  )

  if (dateOnly(startDate) < earliestDate) {
    return {
      error: `Pengajuan cuti harus dilakukan minimal H-${settings.minDaysBeforeLeave} sebelum tanggal mulai.`,
      status: 400 as const,
    }
  }

  const totalDays = await getWorkingDays(
    companyId,
    startDate,
    endDate,
  )

  if (totalDays < 1) {
    return {
      error:
        'Rentang tanggal tidak memiliki hari kerja yang dapat dihitung sebagai cuti.',
      status: 400 as const,
    }
  }

  if (totalDays > settings.maxWorkingDaysPerRequest) {
    return {
      error: `Cuti normal maksimal ${settings.maxWorkingDaysPerRequest} hari kerja.`,
      status: 400 as const,
    }
  }

  let leavePeriodStart: Date | null = null
  let leavePeriodEnd: Date | null = null

  if (type === 'ANNUAL') {
    let period

    try {
      period = await getLeavePeriod(
        companyId,
        employee.employmentDate,
        startDate,
      )
    } catch {
      return {
        error: 'Karyawan belum memiliki periode hak cuti tahunan.',
        status: 400 as const,
      }
    }

    leavePeriodStart = period.start
    leavePeriodEnd = period.end

    const balance = await getAnnualLeaveBalance(
      companyId,
      employeeId,
      startDate,
    )

    const existingRequests =
      await prisma.leaveRequest.findMany({
        where: {
          companyId,
          employeeId,
          type: 'ANNUAL',
          leavePeriodStart: period.start,
          leavePeriodEnd: period.end,
          status: {
            in: [...ACTIVE_LEAVE_STATUSES],
          },
          ...(excludeLeaveId
            ? { id: { not: excludeLeaveId } }
            : {}),
        },
        select: {
          totalDays: true,
        },
      })

    const reservedDays = existingRequests.reduce(
      (sum, request) => sum + request.totalDays,
      0,
    )

    if (reservedDays + totalDays > balance.entitlement) {
      return {
        error: `Sisa hak cuti tidak mencukupi. Hak ${balance.entitlement} hari, sudah digunakan atau diajukan ${reservedDays} hari.`,
        status: 400 as const,
      }
    }
  }

  const conflicts = await prisma.leaveRequest.findMany({
    where: {
      companyId,
      status: {
        in: [...ACTIVE_LEAVE_STATUSES],
      },
      ...(excludeLeaveId
        ? { id: { not: excludeLeaveId } }
        : {}),
      startDate: {
        lte: dateOnly(endDate),
      },
      endDate: {
        gte: dateOnly(startDate),
      },
    },
    select: {
      id: true,
      employeeId: true,
      startDate: true,
      endDate: true,
    },
  })

  const overlapping = conflicts.filter((item) =>
    dateRangeOverlaps(
      startDate,
      endDate,
      item.startDate,
      item.endDate,
    ),
  )

  if (overlapping.some((item) => item.employeeId === employeeId)) {
    return {
      error:
        'Karyawan sudah memiliki pengajuan cuti lain yang tanggalnya bertumpang tindih.',
      status: 409 as const,
    }
  }

  const companyOverlap = overlapping.some(
    (item) => item.employeeId !== employeeId,
  )

  let needsException = false
  let exceptionType:
    | 'OVERLAP'
    | 'HOLIDAY_ADJACENCY_AND_OVERLAP'
    | null = null

  if (companyOverlap) {
    const adjacent = await isAdjacentToHoliday(
      companyId,
      startDate,
      endDate,
    )

    if (!adjacent) {
      return {
        error:
          'Pada tanggal tersebut sudah ada karyawan lain yang mengajukan atau mengambil cuti. Benturan hanya dapat diajukan sebagai pengecualian di sekitar hari libur dan harus disetujui Owner.',
        status: 409 as const,
      }
    }

    needsException = true
    exceptionType = 'HOLIDAY_ADJACENCY_AND_OVERLAP'
  }

  return {
    employee,
    totalDays,
    leavePeriodStart,
    leavePeriodEnd,
    needsException,
    exceptionType,
  }
}

async function findVisibleLeave(
  leaveId: number,
  companyId: number,
  actor: ReturnType<typeof actorOf>,
) {
  const leave = await prisma.leaveRequest.findFirst({
    where: {
      id: leaveId,
      companyId,
    },
    include: leaveInclude,
  })

  if (!leave) {
    return {
      leave: null,
      error: 'Pengajuan cuti tidak ditemukan.',
      status: 404 as const,
    }
  }

  if (!canSeeAllLeaves(actor)) {
    const ownUser = await prisma.user.findFirst({
      where: {
        id: actor.id,
        companyId,
      },
      select: {
        employeeId: true,
      },
    })

    if (
      !ownUser?.employeeId ||
      ownUser.employeeId !== leave.employeeId
    ) {
      return {
        leave: null,
        error: 'Kamu tidak memiliki akses ke pengajuan cuti ini.',
        status: 403 as const,
      }
    }
  }

  return {
    leave,
    error: null,
    status: 200 as const,
  }
}

// =====================================================
// GET /api/leaves
// =====================================================

export async function getLeaves(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)
    const companyId = companyOf(req)

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10),
    )

    const where: any = { companyId }

    if (
      typeof req.query.status === 'string' &&
      req.query.status.trim()
    ) {
      const statuses = [
        'DRAFT',
        'PENDING_MANAGEMENT',
        'PENDING_OWNER',
        'APPROVED',
        'REJECTED',
        'CANCELLED',
      ]

      if (!statuses.includes(req.query.status)) {
        res.status(400).json({
          success: false,
          message: 'Status cuti tidak valid.',
        })
        return
      }

      where.status = req.query.status
    }

    if (
      typeof req.query.type === 'string' &&
      req.query.type.trim()
    ) {
      const types = ['ANNUAL', 'MARRIAGE', 'OTHER']

      if (!types.includes(req.query.type)) {
        res.status(400).json({
          success: false,
          message: 'Jenis cuti tidak valid.',
        })
        return
      }

      where.type = req.query.type
    }

    if (req.query.employeeId !== undefined) {
      const employeeId = isValidId(req.query.employeeId)

      if (!employeeId) {
        res.status(400).json({
          success: false,
          message: 'Employee ID tidak valid.',
        })
        return
      }

      if (!canSeeAllLeaves(actor)) {
        const own = await prisma.user.findFirst({
          where: { id: actor.id, companyId },
          select: { employeeId: true },
        })

        if (own?.employeeId !== employeeId) {
          res.status(403).json({
            success: false,
            message: 'Kamu tidak dapat melihat cuti karyawan lain.',
          })
          return
        }
      }

      where.employeeId = employeeId
    } else if (!canSeeAllLeaves(actor)) {
      const own = await prisma.user.findFirst({
        where: { id: actor.id, companyId },
        select: { employeeId: true },
      })

      if (!own?.employeeId) {
        res.status(200).json({
          success: true,
          data: {
            leaves: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          },
        })
        return
      }

      where.employeeId = own.employeeId
    }

    const start = parseDateOnly(req.query.startDate)
    const end = parseDateOnly(req.query.endDate)

    if (req.query.startDate && !start) {
      res.status(400).json({
        success: false,
        message: 'Filter startDate harus berformat YYYY-MM-DD.',
      })
      return
    }

    if (req.query.endDate && !end) {
      res.status(400).json({
        success: false,
        message: 'Filter endDate harus berformat YYYY-MM-DD.',
      })
      return
    }

    if (start || end) {
      where.startDate = {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      }
    }

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: leaveInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ])

    res.status(200).json({
      success: true,
      data: {
        leaves,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Get leaves error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// GET /api/leaves/:id
// =====================================================

export async function getLeaveById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)
    const companyId = companyOf(req)
    const id = isValidId(req.params.id)

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID pengajuan cuti tidak valid.',
      })
      return
    }

    const result = await findVisibleLeave(id, companyId, actor)

    if (!result.leave) {
      res.status(result.status).json({
        success: false,
        message: result.error,
      })
      return
    }

    res.status(200).json({
      success: true,
      data: { leave: result.leave },
    })
  } catch (error) {
    console.error('Get leave detail error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// POST /api/leaves
// =====================================================

export async function createLeave(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)
    const companyId = companyOf(req)

    const {
      employeeId: requestedEmployeeId,
      startDate: startValue,
      endDate: endValue,
      type: typeValue,
      reason,
      notes,
    } = req.body ?? {}

    const type =
      typeof typeValue === 'string'
        ? typeValue.toUpperCase()
        : ''

    if (!['ANNUAL', 'MARRIAGE', 'OTHER'].includes(type)) {
      res.status(400).json({
        success: false,
        message: 'Jenis cuti harus ANNUAL, MARRIAGE, atau OTHER.',
      })
      return
    }

    if (
      reason !== undefined &&
      reason !== null &&
      typeof reason !== 'string'
    ) {
      res.status(400).json({
        success: false,
        message: 'Alasan cuti harus berupa teks.',
      })
      return
    }

    if (
      notes !== undefined &&
      notes !== null &&
      typeof notes !== 'string'
    ) {
      res.status(400).json({
        success: false,
        message: 'Catatan harus berupa teks.',
      })
      return
    }

    const actorUser = await prisma.user.findFirst({
      where: { id: actor.id, companyId },
      select: { employeeId: true },
    })

    let employeeId = actorUser?.employeeId ?? null

    if (
      requestedEmployeeId !== undefined &&
      requestedEmployeeId !== null &&
      requestedEmployeeId !== ''
    ) {
      const parsedId = isValidId(requestedEmployeeId)

      if (!parsedId) {
        res.status(400).json({
          success: false,
          message: 'Employee ID tidak valid.',
        })
        return
      }

      if (
        parsedId !== actorUser?.employeeId &&
        !canSeeAllLeaves(actor)
      ) {
        res.status(403).json({
          success: false,
          message: 'Kamu hanya dapat mengajukan cuti untuk diri sendiri.',
        })
        return
      }

      employeeId = parsedId
    }

    if (!employeeId) {
      res.status(400).json({
        success: false,
        message:
          'Akun ini belum terhubung dengan data karyawan. Minta HR menghubungkan akun ke karyawan.',
      })
      return
    }

    const startDate = parseDateOnly(startValue)
    const endDate = parseDateOnly(endValue)

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message:
          'Tanggal mulai dan selesai wajib berformat YYYY-MM-DD.',
      })
      return
    }

    const validation = await validateLeaveRequest({
      companyId,
      employeeId,
      startDate,
      endDate,
      type: type as 'ANNUAL' | 'MARRIAGE' | 'OTHER',
    })

    if (validation.error) {
      res.status(validation.status ?? 400).json({
        success: false,
        message: validation.error,
      })
      return
    }

    const leave = await prisma.$transaction(async (tx) => {
      return tx.leaveRequest.create({
        data: {
          companyId,
          employeeId,
          startDate,
          endDate,
          totalDays: validation.totalDays ?? 0,
          type: type as 'ANNUAL' | 'MARRIAGE' | 'OTHER',
          reason:
            typeof reason === 'string'
              ? reason.trim() || null
              : null,
          notes:
            typeof notes === 'string'
              ? notes.trim() || null
              : null,
          status: 'PENDING_MANAGEMENT',
          leavePeriodStart:
            validation.leavePeriodStart ?? startDate,
          leavePeriodEnd:
            validation.leavePeriodEnd ?? endDate,
          createdById: actor.id,
          approval: {
            create: {
              managementStatus: 'PENDING',
              ownerStatus: 'PENDING',
              needsException: validation.needsException ?? false,
              exceptionType: validation.exceptionType ?? null,
              exceptionStatus: validation.needsException
                ? 'PENDING'
                : 'NOT_REQUIRED',
            },
          },
        },
        include: leaveInclude,
      })
    })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'CREATE',
      entity: 'LeaveRequest',
      entityId: leave.id,
      afterData: leave,
      ipAddress: ipOf(req),
      userAgent: userAgentOf(req),
    })

    res.status(201).json({
      success: true,
      message:
        'Pengajuan cuti berhasil dibuat dan menunggu persetujuan Management.',
      data: { leave },
    })
  } catch (error) {
    console.error('Create leave error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// PATCH /api/leaves/:id
// =====================================================

export async function updateLeave(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)
    const companyId = companyOf(req)
    const id = isValidId(req.params.id)

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID pengajuan cuti tidak valid.',
      })
      return
    }

    const existing = await prisma.leaveRequest.findFirst({
      where: { id, companyId },
      include: leaveInclude,
    })

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Pengajuan cuti tidak ditemukan.',
      })
      return
    }

    if (existing.status !== 'PENDING_MANAGEMENT') {
      res.status(409).json({
        success: false,
        message:
          'Hanya pengajuan yang menunggu Management yang dapat diedit.',
      })
      return
    }

    if (
      !canSeeAllLeaves(actor) &&
      existing.createdById !== actor.id
    ) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki akses untuk mengubah pengajuan ini.',
      })
      return
    }

    const startDate =
      req.body?.startDate !== undefined
        ? parseDateOnly(req.body.startDate)
        : existing.startDate

    const endDate =
      req.body?.endDate !== undefined
        ? parseDateOnly(req.body.endDate)
        : existing.endDate

    const typeValue =
      req.body?.type !== undefined
        ? String(req.body.type).toUpperCase()
        : existing.type

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message: 'Tanggal harus berformat YYYY-MM-DD.',
      })
      return
    }

    if (!['ANNUAL', 'MARRIAGE', 'OTHER'].includes(typeValue)) {
      res.status(400).json({
        success: false,
        message: 'Jenis cuti tidak valid.',
      })
      return
    }

    const reason =
      req.body?.reason !== undefined
        ? req.body.reason
        : existing.reason

    const notes =
      req.body?.notes !== undefined
        ? req.body.notes
        : existing.notes

    if (
      reason !== null &&
      reason !== undefined &&
      typeof reason !== 'string'
    ) {
      res.status(400).json({
        success: false,
        message: 'Alasan cuti harus berupa teks.',
      })
      return
    }

    if (
      notes !== null &&
      notes !== undefined &&
      typeof notes !== 'string'
    ) {
      res.status(400).json({
        success: false,
        message: 'Catatan cuti harus berupa teks.',
      })
      return
    }

    const validation = await validateLeaveRequest({
      companyId,
      employeeId: existing.employeeId,
      startDate,
      endDate,
      type: typeValue as 'ANNUAL' | 'MARRIAGE' | 'OTHER',
      excludeLeaveId: id,
    })

    if (validation.error) {
      res.status(validation.status ?? 400).json({
        success: false,
        message: validation.error,
      })
      return
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.leaveApproval.update({
        where: { leaveRequestId: id },
        data: {
          managementStatus: 'PENDING',
          managementApprovedById: null,
          managementApprovedAt: null,
          managementNotes: null,
          ownerStatus: 'PENDING',
          ownerApprovedById: null,
          ownerApprovedAt: null,
          ownerNotes: null,
          needsException: validation.needsException ?? false,
          exceptionType: validation.exceptionType ?? null,
          exceptionStatus: validation.needsException
            ? 'PENDING'
            : 'NOT_REQUIRED',
          exceptionApprovedById: null,
          exceptionApprovedAt: null,
          exceptionNotes: null,
        },
      })

      return tx.leaveRequest.update({
        where: { id },
        data: {
          startDate,
          endDate,
          totalDays: validation.totalDays ?? 0,
          type: typeValue as 'ANNUAL' | 'MARRIAGE' | 'OTHER',
          reason:
            typeof reason === 'string'
              ? reason.trim() || null
              : null,
          notes:
            typeof notes === 'string'
              ? notes.trim() || null
              : null,
          status: 'PENDING_MANAGEMENT',
          leavePeriodStart:
            validation.leavePeriodStart ?? startDate,
          leavePeriodEnd:
            validation.leavePeriodEnd ?? endDate,
        },
        include: leaveInclude,
      })
    })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'UPDATE',
      entity: 'LeaveRequest',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      ipAddress: ipOf(req),
      userAgent: userAgentOf(req),
    })

    res.status(200).json({
      success: true,
      message: 'Pengajuan cuti berhasil diperbarui.',
      data: { leave: updated },
    })
  } catch (error) {
    console.error('Update leave error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// PATCH /api/leaves/:id/cancel
// =====================================================

export async function cancelLeave(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)
    const companyId = companyOf(req)
    const id = isValidId(req.params.id)

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID pengajuan cuti tidak valid.',
      })
      return
    }

    const existing = await prisma.leaveRequest.findFirst({
      where: { id, companyId },
      include: leaveInclude,
    })

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Pengajuan cuti tidak ditemukan.',
      })
      return
    }

    if (
      !['PENDING_MANAGEMENT', 'PENDING_OWNER'].includes(
        existing.status,
      )
    ) {
      res.status(409).json({
        success: false,
        message:
          'Pengajuan yang sudah diputuskan tidak dapat dibatalkan melalui endpoint ini.',
      })
      return
    }

    if (
      !canSeeAllLeaves(actor) &&
      existing.createdById !== actor.id
    ) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki akses untuk membatalkan pengajuan ini.',
      })
      return
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.leaveRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: leaveInclude,
      })

      await tx.leaveApproval.updateMany({
        where: { leaveRequestId: id },
        data: {
          managementStatus: 'SKIPPED',
          ownerStatus: 'SKIPPED',
          exceptionStatus: existing.approval?.needsException
            ? 'REJECTED'
            : 'NOT_REQUIRED',
        },
      })

      return cancelled
    })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action: 'CANCEL',
      entity: 'LeaveRequest',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      ipAddress: ipOf(req),
      userAgent: userAgentOf(req),
    })

    res.status(200).json({
      success: true,
      message: 'Pengajuan cuti berhasil dibatalkan.',
      data: { leave: updated },
    })
  } catch (error) {
    console.error('Cancel leave error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// GET /api/leaves/approvals
// =====================================================

export async function getPendingApprovals(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)
    const companyId = companyOf(req)

    const canManagement =
      actor.permissions.includes('leave.approve_management')
    const canOwner =
      actor.permissions.includes('leave.approve_owner')

    if (!canManagement && !canOwner) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki izin untuk melihat antrean approval.',
      })
      return
    }

    const where: any = { companyId }

    if (actor.isOwner || (canOwner && !canManagement)) {
      where.OR = [
        {
          status: 'PENDING_OWNER',
          approval: {
            is: {
              managementStatus: 'APPROVED',
              needsException: false,
            },
          },
        },
        {
          status: 'PENDING_OWNER',
          approval: {
            is: {
              managementStatus: 'APPROVED',
              needsException: true,
              exceptionStatus: 'APPROVED',
            },
          },
        },
        {
          status: 'PENDING_OWNER',
          approval: {
            is: {
              managementStatus: 'APPROVED',
              needsException: true,
              exceptionStatus: 'PENDING',
            },
          },
        },
      ]
    } else if (canManagement) {
      where.status = 'PENDING_MANAGEMENT'
    } else {
      where.status = {
        in: ['PENDING_MANAGEMENT', 'PENDING_OWNER'],
      }
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: leaveInclude,
      orderBy: { createdAt: 'asc' },
    })

    res.status(200).json({
      success: true,
      data: { leaves },
    })
  } catch (error) {
    console.error('Get pending approvals error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// POST /api/leaves/:id/approvals/management
// Body: { "decision": "APPROVE" | "REJECT", "notes": "..." }
// =====================================================

export async function approveManagement(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)

    if (actor.isOwner) {
      res.status(403).json({
        success: false,
        message:
          'Owner tidak dapat menggantikan tahap persetujuan Management.',
      })
      return
    }

    const companyId = companyOf(req)
    const id = isValidId(req.params.id)
    const decision = parseDecision(req.body?.decision)
    const notes = req.body?.notes

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID pengajuan cuti tidak valid.',
      })
      return
    }

    if (!decision) {
      res.status(400).json({
        success: false,
        message: 'decision harus APPROVE atau REJECT.',
      })
      return
    }

    if (
      notes !== undefined &&
      notes !== null &&
      typeof notes !== 'string'
    ) {
      res.status(400).json({
        success: false,
        message: 'Catatan approval harus berupa teks.',
      })
      return
    }

    const leave = await prisma.leaveRequest.findFirst({
      where: { id, companyId },
      include: { approval: true },
    })

    if (!leave) {
      res.status(404).json({
        success: false,
        message: 'Pengajuan cuti tidak ditemukan.',
      })
      return
    }

    const approverEmployee = await prisma.user.findFirst({
      where: { id: actor.id, companyId },
      select: { employeeId: true },
    })

    if (
      approverEmployee?.employeeId === leave.employeeId
    ) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak dapat menyetujui pengajuan cuti milik sendiri.',
      })
      return
    }

    if (
      leave.status !== 'PENDING_MANAGEMENT' ||
      !leave.approval ||
      leave.approval.managementStatus !== 'PENDING'
    ) {
      res.status(409).json({
        success: false,
        message:
          'Pengajuan ini tidak sedang menunggu approval Management.',
      })
      return
    }

    const nextStatus =
      decision === 'APPROVED'
        ? 'PENDING_OWNER'
        : 'REJECTED'

    const updated = await prisma.$transaction(async (tx) => {
      await tx.leaveApproval.update({
        where: { leaveRequestId: id },
        data: {
          managementStatus: decision,
          managementApprovedById: actor.id,
          managementApprovedAt: new Date(),
          managementNotes:
            typeof notes === 'string'
              ? notes.trim() || null
              : null,
          ...(decision === 'REJECTED'
            ? { ownerStatus: 'SKIPPED' }
            : {}),
        },
      })

      return tx.leaveRequest.update({
        where: { id },
        data: { status: nextStatus },
        include: leaveInclude,
      })
    })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action:
        decision === 'APPROVED'
          ? 'APPROVE_MANAGEMENT'
          : 'REJECT_MANAGEMENT',
      entity: 'LeaveRequest',
      entityId: id,
      beforeData: leave,
      afterData: updated,
      ipAddress: ipOf(req),
      userAgent: userAgentOf(req),
    })

    res.status(200).json({
      success: true,
      message:
        decision === 'APPROVED'
          ? 'Pengajuan disetujui Management dan diteruskan ke Owner.'
          : 'Pengajuan ditolak oleh Management.',
      data: { leave: updated },
    })
  } catch (error) {
    console.error('Management approval error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// POST /api/leaves/:id/approvals/exception
// Khusus Owner. Body: { "decision": "APPROVE" | "REJECT" }
// =====================================================

export async function approveException(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)

    if (!actor.isOwner) {
      res.status(403).json({
        success: false,
        message:
          'Keputusan pengecualian hanya dapat dilakukan oleh Owner.',
      })
      return
    }

    const companyId = companyOf(req)
    const id = isValidId(req.params.id)
    const decision = parseDecision(req.body?.decision)
    const notes = req.body?.notes

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID pengajuan cuti tidak valid.',
      })
      return
    }

    if (!decision) {
      res.status(400).json({
        success: false,
        message: 'decision harus APPROVE atau REJECT.',
      })
      return
    }

    if (
      notes !== undefined &&
      notes !== null &&
      typeof notes !== 'string'
    ) {
      res.status(400).json({
        success: false,
        message: 'Catatan approval harus berupa teks.',
      })
      return
    }

    const leave = await prisma.leaveRequest.findFirst({
      where: { id, companyId },
      include: { approval: true },
    })

    if (!leave) {
      res.status(404).json({
        success: false,
        message: 'Pengajuan cuti tidak ditemukan.',
      })
      return
    }

    const approverEmployee = await prisma.user.findFirst({
      where: { id: actor.id, companyId },
      select: { employeeId: true },
    })

    if (
      approverEmployee?.employeeId === leave.employeeId
    ) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak dapat menyetujui pengajuan cuti milik sendiri.',
      })
      return
    }

    if (
      !leave.approval?.needsException ||
      leave.approval.exceptionStatus !== 'PENDING'
    ) {
      res.status(409).json({
        success: false,
        message:
          'Pengajuan ini tidak memiliki pengecualian yang menunggu keputusan Owner.',
      })
      return
    }

    if (leave.status !== 'PENDING_OWNER') {
      res.status(409).json({
        success: false,
        message:
          'Pengecualian hanya dapat diputuskan setelah tahap Management selesai.',
      })
      return
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.leaveApproval.update({
        where: { leaveRequestId: id },
        data: {
          exceptionStatus:
            decision === 'APPROVED'
              ? 'APPROVED'
              : 'REJECTED',
          exceptionApprovedById: actor.id,
          exceptionApprovedAt: new Date(),
          exceptionNotes:
            typeof notes === 'string'
              ? notes.trim() || null
              : null,
          ...(decision === 'REJECTED'
            ? {
                ownerStatus: 'REJECTED',
                ownerApprovedById: actor.id,
                ownerApprovedAt: new Date(),
                ownerNotes:
                  typeof notes === 'string'
                    ? notes.trim() || null
                    : null,
              }
            : {}),
        },
      })

      return tx.leaveRequest.update({
        where: { id },
        data:
          decision === 'REJECTED'
            ? { status: 'REJECTED' }
            : {},
        include: leaveInclude,
      })
    })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action:
        decision === 'APPROVED'
          ? 'APPROVE_LEAVE_EXCEPTION'
          : 'REJECT_LEAVE_EXCEPTION',
      entity: 'LeaveRequest',
      entityId: id,
      beforeData: leave,
      afterData: updated,
      ipAddress: ipOf(req),
      userAgent: userAgentOf(req),
    })

    res.status(200).json({
      success: true,
      message:
        decision === 'APPROVED'
          ? 'Pengecualian disetujui. Pengajuan menunggu keputusan akhir Owner.'
          : 'Pengecualian ditolak dan pengajuan cuti ditolak.',
      data: { leave: updated },
    })
  } catch (error) {
    console.error('Exception approval error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// POST /api/leaves/:id/approvals/owner
// Khusus Owner. Body: { "decision": "APPROVE" | "REJECT" }
// =====================================================

export async function approveOwner(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)

    if (!actor.isOwner) {
      res.status(403).json({
        success: false,
        message:
          'Persetujuan tahap Owner hanya dapat dilakukan oleh Owner.',
      })
      return
    }

    const companyId = companyOf(req)
    const id = isValidId(req.params.id)
    const decision = parseDecision(req.body?.decision)
    const notes = req.body?.notes

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID pengajuan cuti tidak valid.',
      })
      return
    }

    if (!decision) {
      res.status(400).json({
        success: false,
        message: 'decision harus APPROVE atau REJECT.',
      })
      return
    }

    if (
      notes !== undefined &&
      notes !== null &&
      typeof notes !== 'string'
    ) {
      res.status(400).json({
        success: false,
        message: 'Catatan approval harus berupa teks.',
      })
      return
    }

    const leave = await prisma.leaveRequest.findFirst({
      where: { id, companyId },
      include: { approval: true },
    })

    if (!leave) {
      res.status(404).json({
        success: false,
        message: 'Pengajuan cuti tidak ditemukan.',
      })
      return
    }

    const approverEmployee = await prisma.user.findFirst({
      where: { id: actor.id, companyId },
      select: { employeeId: true },
    })

    if (
      approverEmployee?.employeeId === leave.employeeId
    ) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak dapat menyetujui pengajuan cuti milik sendiri.',
      })
      return
    }

    if (
      leave.status !== 'PENDING_OWNER' ||
      !leave.approval ||
      leave.approval.managementStatus !== 'APPROVED'
    ) {
      res.status(409).json({
        success: false,
        message:
          'Pengajuan belum disetujui Management atau tidak sedang menunggu Owner.',
      })
      return
    }

    if (
      leave.approval.needsException &&
      leave.approval.exceptionStatus !== 'APPROVED'
    ) {
      res.status(409).json({
        success: false,
        message:
          'Pengecualian harus disetujui Owner terlebih dahulu.',
      })
      return
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.leaveApproval.update({
        where: { leaveRequestId: id },
        data: {
          ownerStatus: decision,
          ownerApprovedById: actor.id,
          ownerApprovedAt: new Date(),
          ownerNotes:
            typeof notes === 'string'
              ? notes.trim() || null
              : null,
        },
      })

      return tx.leaveRequest.update({
        where: { id },
        data: { status: decision },
        include: leaveInclude,
      })
    })

    await auditService.log({
      companyId,
      actorType: 'COMPANY',
      actorId: actor.id,
      userId: actor.id,
      action:
        decision === 'APPROVED'
          ? 'APPROVE_OWNER'
          : 'REJECT_OWNER',
      entity: 'LeaveRequest',
      entityId: id,
      beforeData: leave,
      afterData: updated,
      ipAddress: ipOf(req),
      userAgent: userAgentOf(req),
    })

    res.status(200).json({
      success: true,
      message:
        decision === 'APPROVED'
          ? 'Pengajuan cuti disetujui Owner.'
          : 'Pengajuan cuti ditolak Owner.',
      data: { leave: updated },
    })
  } catch (error) {
    console.error('Owner approval error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// GET /api/leaves/balance/:employeeId
// =====================================================

export async function getLeaveBalance(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)
    const companyId = companyOf(req)
    const employeeId = isValidId(req.params.employeeId)

    if (!employeeId) {
      res.status(400).json({
        success: false,
        message: 'Employee ID tidak valid.',
      })
      return
    }

    if (!canSeeAllLeaves(actor)) {
      const own = await prisma.user.findFirst({
        where: { id: actor.id, companyId },
        select: { employeeId: true },
      })

      if (own?.employeeId !== employeeId) {
        res.status(403).json({
          success: false,
          message: 'Kamu hanya dapat melihat saldo cuti sendiri.',
        })
        return
      }
    }

    const balance = await getAnnualLeaveBalance(
      companyId,
      employeeId,
    )

    res.status(200).json({
      success: true,
      data: { balance },
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'EMPLOYEE_NOT_FOUND'
    ) {
      res.status(404).json({
        success: false,
        message: 'Karyawan tidak ditemukan atau tidak aktif.',
      })
      return
    }

    if (
      error instanceof Error &&
      error.message === 'EMPLOYEE_NOT_ELIGIBLE'
    ) {
      res.status(200).json({
        success: true,
        data: {
          balance: {
            entitlement: 0,
            usedDays: 0,
            pendingDays: 0,
            remainingDays: 0,
            availableDays: 0,
            eligible: false,
            message:
              'Karyawan belum mencapai masa kerja 1 tahun.',
          },
        },
      })
      return
    }

    console.error('Get leave balance error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// GET /api/leaves/history/:employeeId
// =====================================================

export async function getLeaveHistory(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)
    const companyId = companyOf(req)
    const employeeId = isValidId(req.params.employeeId)

    if (!employeeId) {
      res.status(400).json({
        success: false,
        message: 'Employee ID tidak valid.',
      })
      return
    }

    if (!canSeeAllLeaves(actor)) {
      const own = await prisma.user.findFirst({
        where: { id: actor.id, companyId },
        select: { employeeId: true },
      })

      if (own?.employeeId !== employeeId) {
        res.status(403).json({
          success: false,
          message: 'Kamu hanya dapat melihat riwayat cuti sendiri.',
        })
        return
      }
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: { companyId, employeeId },
      include: leaveInclude,
      orderBy: { startDate: 'desc' },
    })

    res.status(200).json({
      success: true,
      data: { leaves },
    })
  } catch (error) {
    console.error('Get leave history error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}

// =====================================================
// GET /api/leaves/calendar
// Query: startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// =====================================================

export async function getLeaveCalendar(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const actor = actorOf(req)
    const companyId = companyOf(req)

    const startDate = parseDateOnly(req.query.startDate)
    const endDate = parseDateOnly(req.query.endDate)

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        message:
          'startDate dan endDate wajib berformat YYYY-MM-DD.',
      })
      return
    }

    if (endDate < startDate) {
      res.status(400).json({
        success: false,
        message: 'endDate tidak boleh sebelum startDate.',
      })
      return
    }

    const where: any = {
      companyId,
      status: {
        in: [...ACTIVE_LEAVE_STATUSES],
      },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    }

    if (!canSeeAllLeaves(actor)) {
      const own = await prisma.user.findFirst({
        where: { id: actor.id, companyId },
        select: { employeeId: true },
      })

      if (!own?.employeeId) {
        res.status(200).json({
          success: true,
          data: { leaves: [], holidays: [] },
        })
        return
      }

      where.employeeId = own.employeeId
    }

    const [leaves, holidays] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          startDate: true,
          endDate: true,
          totalDays: true,
          type: true,
          status: true,
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
      }),
      prisma.holiday.findMany({
        where: {
          companyId,
          isActive: true,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          date: true,
          name: true,
          description: true,
        },
        orderBy: { date: 'asc' },
      }),
    ])

    res.status(200).json({
      success: true,
      data: { leaves, holidays },
    })
  } catch (error) {
    console.error('Get leave calendar error:', error)
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    })
  }
}