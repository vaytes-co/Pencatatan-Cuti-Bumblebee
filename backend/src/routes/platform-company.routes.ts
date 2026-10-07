import { Router } from 'express'

import {
  getCompanies,
  getCompanyById,
  updateCompany,
} from '../controllers/platform-company.controller.js'

import {
  createCompany,
} from '../controllers/company.controller.js'

import {
  platformAuthMiddleware,
} from '../middlewares/platform-auth.middleware.js'

import {
  requirePlatformPermission,
} from '../middlewares/platform-permission.middleware.js'

const router = Router()

router.get(
  '/',
  platformAuthMiddleware,
  requirePlatformPermission(
    'platform.companies.read',
  ),
  getCompanies,
)

router.get(
  '/:id',
  platformAuthMiddleware,
  requirePlatformPermission(
    'platform.companies.read',
  ),
  getCompanyById,
)

router.post(
  '/',
  platformAuthMiddleware,
  requirePlatformPermission(
    'platform.companies.create',
  ),
  createCompany,
)

router.patch(
  '/:id',
  platformAuthMiddleware,
  requirePlatformPermission(
    'platform.companies.update',
  ),
  updateCompany,
)

export default router