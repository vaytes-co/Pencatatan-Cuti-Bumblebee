import type {
  NextFunction,
  Request,
  Response,
} from 'express'

import prisma from '../lib/db.js'

import type {
  AuthenticatedRequest,
} from './auth.middleware.js'

export function requireModule(
  moduleKey: string,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // --------------------------------------------------
      // 1. Ambil authenticated request
      // --------------------------------------------------

      const authenticatedRequest =
        req as AuthenticatedRequest

      if (!authenticatedRequest.user) {
        res.status(401).json({
          success: false,
          message:
            'Autentikasi diperlukan.',
        })
        return
      }

      // --------------------------------------------------
      // 2. Ambil company dari authentication context
      // --------------------------------------------------

      const companyId =
        authenticatedRequest.user.companyId

      if (
        !Number.isSafeInteger(companyId) ||
        companyId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            'Company context tidak valid.',
        })
        return
      }

      // --------------------------------------------------
      // 3. Validasi module key
      // --------------------------------------------------

      if (
        typeof moduleKey !== 'string' ||
        !moduleKey.trim()
      ) {
        res.status(500).json({
          success: false,
          message:
            'Module key tidak valid.',
        })
        return
      }

      const normalizedModuleKey =
        moduleKey.trim()

      // --------------------------------------------------
      // 4. Cari module yang aktif untuk company
      // --------------------------------------------------

      const companyModule =
        await prisma.companyModule.findFirst({
          where: {
            companyId,
            status: 'ACTIVE',
            module: {
              key: normalizedModuleKey,
            },
          },
          select: {
            id: true,
            companyId: true,
            moduleId: true,
            status: true,

            module: {
              select: {
                id: true,
                key: true,
                name: true,
              },
            },
          },
        })

      // --------------------------------------------------
      // 5. Module belum aktif
      // --------------------------------------------------

      if (!companyModule) {
        res.status(403).json({
          success: false,
          message:
            'Module belum aktif untuk perusahaan kamu.',
          module: normalizedModuleKey,
        })
        return
      }

      // --------------------------------------------------
      // 6. Module aktif
      // --------------------------------------------------

      next()
    } catch (error) {
      console.error(
        'Module middleware error:',
        error,
      )

      res.status(500).json({
        success: false,
        message:
          'Terjadi kesalahan saat memeriksa module.',
      })
    }
  }
}