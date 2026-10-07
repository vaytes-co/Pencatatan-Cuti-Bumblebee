import { Router } from 'express'

import {
  createEmployee,
  getEmployees,
} from '../controllers/employee.controller.js'

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
  requirePermission('employees.read'),
  getEmployees,
)

router.post(
  '/',
  authMiddleware,
  requirePermission('employees.create'),
  createEmployee,
)

export default router