import { Router } from 'express'

import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  activateUser,
  deactivateUser,
} from '../controllers/user.controller.js'

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
  requirePermission('users.read'),
  getUsers,
)

router.get(
  '/:id',
  authMiddleware,
  requirePermission('users.read'),
  getUserById,
)

router.post(
  '/',
  authMiddleware,
  requirePermission('users.create'),
  createUser,
)

router.patch(
  '/:id',
  authMiddleware,
  requirePermission('users.update'),
  updateUser,
)

router.patch(
  '/:id/activate',
  authMiddleware,
  requirePermission('users.update'),
  activateUser,
)

router.patch(
  '/:id/deactivate',
  authMiddleware,
  requirePermission('users.update'),
  deactivateUser,
)

export default router