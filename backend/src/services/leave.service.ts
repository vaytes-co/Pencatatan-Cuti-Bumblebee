import prisma from '../lib/db.js'

export const ACTIVE_LEAVE_STATUSES = [
  'PENDING_MANAGEMENT',
  'PENDING_OWNER',
  'APPROVED',
] as const

export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string') return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

export function dateOnly(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  )
}

export function addDays(date: Date, days: number): Date {
  const result = dateOnly(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

export function formatDate(date: Date): string {
  return dateOnly(date).toISOString().slice(0, 10)
}

function anniversaryDate(
  employmentDate: Date,
  year: number,
): Date {
  const month = employmentDate.getUTCMonth()
  const day = employmentDate.getUTCDate()
  const lastDay = new Date(
    Date.UTC(year, month + 1, 0),
  ).getUTCDate()

  return new Date(
    Date.UTC(year, month, Math.min(day, lastDay)),
  )
}

export function getCompletedYears(
  employmentDate: Date,
  onDate: Date,
): number {
  const employment = dateOnly(employmentDate)
  const target = dateOnly(onDate)

  let years =
    target.getUTCFullYear() -
    employment.getUTCFullYear()

  if (
    target <
    anniversaryDate(
      employment,
      employment.getUTCFullYear() + years,
    )
  ) {
    years -= 1
  }

  return Math.max(0, years)
}

export async function getLeaveSettings(companyId: number) {
  const rows = await prisma.setting.findMany({
    where: {
      companyId,
      key: {
        in: [
          'MIN_HARI_PENGAJUAN',
          'MAX_HARI_CUTI',
          'HAK_CUTI_1_TAHUN',
          'HAK_CUTI_2_TAHUN',
          'HAK_CUTI_3_TAHUN',
        ],
      },
    },
    select: {
      key: true,
      value: true,
    },
  })

  const values = new Map(
    rows.map((row) => [row.key, Number(row.value)]),
  )

  const setting = (key: string, fallback: number) => {
    const value = values.get(key)

    return Number.isFinite(value) && value! >= 0
      ? value!
      : fallback
  }

  return {
    minDaysBeforeLeave: setting('MIN_HARI_PENGAJUAN', 7),
    maxWorkingDaysPerRequest: setting('MAX_HARI_CUTI', 3),
    entitlement1Year: setting('HAK_CUTI_1_TAHUN', 7),
    entitlement2Years: setting('HAK_CUTI_2_TAHUN', 10),
    entitlement3Years: setting('HAK_CUTI_3_TAHUN', 12),
  }
}

export async function getLeavePeriod(
  companyId: number,
  employmentDate: Date,
  targetDate: Date,
) {
  const employment = dateOnly(employmentDate)
  const target = dateOnly(targetDate)

  const completedYears = getCompletedYears(
    employment,
    target,
  )

  if (completedYears < 1) {
    throw new Error('EMPLOYEE_NOT_ELIGIBLE')
  }

  const periodStart = anniversaryDate(
    employment,
    employment.getUTCFullYear() + completedYears,
  )

  const periodEnd = addDays(
    anniversaryDate(
      employment,
      employment.getUTCFullYear() +
        completedYears +
        1,
    ),
    -1,
  )

  const settings = await getLeaveSettings(companyId)

  let entitlement = settings.entitlement1Year

  if (completedYears >= 3) {
    entitlement = settings.entitlement3Years
  } else if (completedYears >= 2) {
    entitlement = settings.entitlement2Years
  }

  return {
    start: periodStart,
    end: periodEnd,
    entitlement,
    completedYears,
  }
}

export async function getWorkingDays(
  companyId: number,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const start = dateOnly(startDate)
  const end = dateOnly(endDate)

  if (end < start) return 0

  const holidays = await prisma.holiday.findMany({
    where: {
      companyId,
      isActive: true,
      date: {
        gte: start,
        lte: end,
      },
    },
    select: {
      date: true,
    },
  })

  const holidayKeys = new Set(
    holidays.map((holiday) => formatDate(holiday.date)),
  )

  let count = 0

  for (
    let cursor = start;
    cursor <= end;
    cursor = addDays(cursor, 1)
  ) {
    const weekday = cursor.getUTCDay()
    const isWeekend = weekday === 0 || weekday === 6

    if (
      !isWeekend &&
      !holidayKeys.has(formatDate(cursor))
    ) {
      count += 1
    }
  }

  return count
}

export async function getAnnualLeaveBalance(
  companyId: number,
  employeeId: number,
  asOfDate: Date = new Date(),
) {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      employmentDate: true,
    },
  })

  if (!employee) {
    throw new Error('EMPLOYEE_NOT_FOUND')
  }

  const period = await getLeavePeriod(
    companyId,
    employee.employmentDate,
    asOfDate,
  )

  const requests = await prisma.leaveRequest.findMany({
    where: {
      companyId,
      employeeId,
      type: 'ANNUAL',
      leavePeriodStart: period.start,
      leavePeriodEnd: period.end,
      status: {
        in: [...ACTIVE_LEAVE_STATUSES],
      },
    },
    select: {
      totalDays: true,
      status: true,
    },
  })

  const usedDays = requests
    .filter((request) => request.status === 'APPROVED')
    .reduce((sum, request) => sum + request.totalDays, 0)

  const pendingDays = requests
    .filter(
      (request) =>
        request.status === 'PENDING_MANAGEMENT' ||
        request.status === 'PENDING_OWNER',
    )
    .reduce((sum, request) => sum + request.totalDays, 0)

  return {
    employee,
    period: {
      startDate: formatDate(period.start),
      endDate: formatDate(period.end),
    },
    completedYears: period.completedYears,
    entitlement: period.entitlement,
    usedDays,
    pendingDays,
    remainingDays: Math.max(
      0,
      period.entitlement - usedDays,
    ),
    availableDays: Math.max(
      0,
      period.entitlement - usedDays - pendingDays,
    ),
  }
}