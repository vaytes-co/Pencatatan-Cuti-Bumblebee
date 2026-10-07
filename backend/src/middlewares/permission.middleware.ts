import type {
  NextFunction,
  Request,
  Response,
} from 'express'

import type {
  AuthenticatedRequest,
} from './auth.middleware.js'

export function requirePermission(
  permission: string,
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const authenticatedRequest =
      req as AuthenticatedRequest

    const user =
      authenticatedRequest.user

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          'Silakan login terlebih dahulu.',
      })
    }

    const hasPermission =
      user.permissions.includes(permission)

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki izin untuk melakukan tindakan ini.',
      })
    }

    next()
  }
}