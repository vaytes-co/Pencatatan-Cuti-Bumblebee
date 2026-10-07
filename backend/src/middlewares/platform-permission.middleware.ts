import type { NextFunction, Request, Response } from 'express'

import type { PlatformAuthenticatedRequest } from './platform-auth.middleware.js'

export function requirePlatformPermission(
  permission: string,
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    const platformRequest =
      req as PlatformAuthenticatedRequest

    if (!platformRequest.user) {
      res.status(401).json({
        success: false,
        message: 'Autentikasi platform diperlukan.',
      })
      return
    }

    const hasPermission =
      platformRequest.user.permissions.includes(permission)

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki permission untuk melakukan aksi ini.',
        requiredPermission: permission,
      })
      return
    }

    next()
  }
}