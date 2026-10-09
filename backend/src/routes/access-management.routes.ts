import { Router } from 'express'

import {
  getPermissions,
  assignRole,
  revokeRole,
  setUserPermission,
  revokeUserPermission,
} from '../controllers/access-management.controller.js'

import {
  authMiddleware,
} from '../middlewares/auth.middleware.js'

import {
  requirePermission,
} from '../middlewares/permission.middleware.js'

const router = Router()

router.get(
  '/permissions',
  authMiddleware,
  requirePermission('users.manage_permissions'),
  getPermissions,
)

router.post(
  '/users/:userId/roles/:roleId',
  authMiddleware,
  requirePermission('users.update'),
  assignRole,
)

router.delete(
  '/users/:userId/roles/:roleId',
  authMiddleware,
  requirePermission('users.update'),
  revokeRole,
)

router.put(
  '/users/:userId/permissions/:permissionId',
  authMiddleware,
  requirePermission(
    'users.manage_permissions',
  ),
  setUserPermission,
)

router.delete(
  '/users/:userId/permissions/:permissionId',
  authMiddleware,
  requirePermission(
    'users.manage_permissions',
  ),
  revokeUserPermission,
)

export default router