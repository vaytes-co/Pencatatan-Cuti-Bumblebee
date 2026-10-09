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

    if (
      !authenticatedRequest.user
    ) {
      res.status(401).json({
        success: false,
        message:
          'Autentikasi diperlukan.',
      })

      return
    }

    if (
      !authenticatedRequest.user.permissions.includes(
        permission,
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          'Kamu tidak memiliki izin untuk melakukan tindakan ini.',
        permission,
      })

      return
    }

    next()
  }
}

export default requirePermission