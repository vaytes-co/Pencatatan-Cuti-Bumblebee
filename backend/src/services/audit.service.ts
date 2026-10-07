import prisma from '../lib/db.js'

import type {
  Prisma,
} from '../generated/prisma/client.js'

export type AuditActorType =
  | 'PLATFORM'
  | 'COMPANY'
  | 'SYSTEM'

export interface CreateAuditLogInput {
  companyId?: number | null
  actorType: AuditActorType
  actorId?: number | null

  /**
   * Tetap dipertahankan untuk backward compatibility
   * dengan audit log lama yang menggunakan userId.
   */
  userId?: number | null

  action: string
  entity: string
  entityId?: string | number | null

  beforeData?: unknown
  afterData?: unknown

  ipAddress?: string | null
  userAgent?: string | null
}

function sanitizeData(
  data: unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      const sensitiveKeys = [
        'password',
        'passwordhash',
        'token',
        'accesstoken',
        'refreshtoken',
        'jwt',
        'authorization',
        'cookie',
      ]

      if (
        sensitiveKeys.includes(
          key.toLowerCase(),
        )
      ) {
        return '[REDACTED]'
      }

      return value
    }),
  ) as Prisma.InputJsonValue
}

function normalizeEntityId(
  entityId:
    | string
    | number
    | null
    | undefined,
): string | undefined {
  if (
    entityId === undefined ||
    entityId === null
  ) {
    return undefined
  }

  return String(entityId)
}

export async function createAuditLog(
  input: CreateAuditLogInput,
) {
  const {
    companyId = null,
    actorType,
    actorId = null,
    userId = null,
    action,
    entity,
    entityId,
    beforeData,
    afterData,
    ipAddress = null,
    userAgent = null,
  } = input

  if (
    !actorType ||
    ![
      'PLATFORM',
      'COMPANY',
      'SYSTEM',
    ].includes(actorType)
  ) {
    throw new Error(
      'Audit actor type tidak valid.',
    )
  }

  if (!action.trim()) {
    throw new Error(
      'Audit action wajib diisi.',
    )
  }

  if (!entity.trim()) {
    throw new Error(
      'Audit entity wajib diisi.',
    )
  }

  const auditData: Prisma.AuditLogCreateInput = {
    company:
      companyId !== null
        ? {
            connect: {
              id: companyId,
            },
          }
        : undefined,

    actorType,

    actorId,

    user:
      userId !== null
        ? {
            connect: {
              id: userId,
            },
          }
        : undefined,

    action: action.trim(),

    entity: entity.trim(),

    entityId:
      normalizeEntityId(entityId),

    ipAddress,

    userAgent,
  }

  if (beforeData !== undefined) {
    auditData.beforeData =
      sanitizeData(beforeData)
  }

  if (afterData !== undefined) {
    auditData.afterData =
      sanitizeData(afterData)
  }

  return prisma.auditLog.create({
    data: auditData,
  })
}

export const auditService = {
  log: createAuditLog,
}

export default auditService