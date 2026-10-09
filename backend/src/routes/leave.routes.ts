import { Router } from 'express'

import { authMiddleware } from '../middlewares/auth.middleware.js'
import { requirePermission } from '../middlewares/permission.middleware.js'

import {
  approveException,
  approveManagement,
  approveOwner,
  cancelLeave,
  createLeave,
  getLeaveBalance,
  getLeaveById,
  getLeaveCalendar,
  getLeaveHistory,
  getLeaves,
  getPendingApprovals,
  updateLeave,
} from '../controllers/leave.controller.js'

const router = Router()

router.get(
  '/',
  authMiddleware,
  requirePermission('leave.read'),
  getLeaves,
)

router.post(
  '/',
  authMiddleware,
  requirePermission('leave.create'),
  createLeave,
)

router.get(
  '/approvals',
  authMiddleware,
  getPendingApprovals,
)

router.get(
  '/calendar',
  authMiddleware,
  requirePermission('leave.read'),
  getLeaveCalendar,
)

router.get(
  '/balance/:employeeId',
  authMiddleware,
  requirePermission('leave.read'),
  getLeaveBalance,
)

router.get(
  '/history/:employeeId',
  authMiddleware,
  requirePermission('leave.read'),
  getLeaveHistory,
)

router.post(
  '/:id/approvals/management',
  authMiddleware,
  requirePermission('leave.approve_management'),
  approveManagement,
)

router.post(
  '/:id/approvals/owner',
  authMiddleware,
  requirePermission('leave.approve_owner'),
  approveOwner,
)

router.post(
  '/:id/approvals/exception',
  authMiddleware,
  requirePermission('leave.approve_exception'),
  approveException,
)

router.patch(
  '/:id/cancel',
  authMiddleware,
  requirePermission('leave.delete'),
  cancelLeave,
)

router.patch(
  '/:id',
  authMiddleware,
  requirePermission('leave.update'),
  updateLeave,
)

router.get(
  '/:id',
  authMiddleware,
  requirePermission('leave.read'),
  getLeaveById,
)

export default router