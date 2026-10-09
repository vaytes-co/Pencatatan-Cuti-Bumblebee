import { Router } from 'express'

import {
  getDelegations,
  createDelegation,
  deleteDelegation,
} from '../controllers/permission-delegation.controller.js'

import {
  authMiddleware,
} from '../middlewares/auth.middleware.js'

import {
  requirePermission,
} from '../middlewares/permission.middleware.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  requirePermission(
    'users.manage_permissions',
  ),
  getDelegations,
)

router.post(
  '/',
  authMiddleware,
  requirePermission(
    'users.manage_permissions',
  ),
  createDelegation,
)

router.delete(
  '/:id',
  authMiddleware,
  requirePermission(
    'users.manage_permissions',
  ),
  deleteDelegation,
)

export default router