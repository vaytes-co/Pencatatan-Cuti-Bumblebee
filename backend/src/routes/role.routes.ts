import { Router } from 'express'

import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/role.controller.js'

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
  requirePermission('roles.read'),
  getRoles,
)

router.get(
  '/:id',
  authMiddleware,
  requirePermission('roles.read'),
  getRoleById,
)

router.post(
  '/',
  authMiddleware,
  requirePermission('roles.create'),
  createRole,
)

router.patch(
  '/:id',
  authMiddleware,
  requirePermission('roles.update'),
  updateRole,
)

router.delete(
  '/:id',
  authMiddleware,
  requirePermission('roles.delete'),
  deleteRole,
)

export default router