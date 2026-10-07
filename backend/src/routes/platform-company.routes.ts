import { Router } from 'express'

import {
  getCompanies,
  getCompanyById,
  updateCompany,
  suspendCompany,
  activateCompany,
  getCompanyModules,
  activateCompanyModule,
  deactivateCompanyModule,
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

router.patch(
  '/:id/suspend',
  platformAuthMiddleware,
  requirePlatformPermission(
    'platform.companies.suspend',
  ),
  suspendCompany,
)

router.patch(
  '/:id/activate',
  platformAuthMiddleware,
  requirePlatformPermission(
    'platform.companies.activate',
  ),
  activateCompany,
)

router.get(
  '/:id/modules',
  platformAuthMiddleware,
  requirePlatformPermission(
    'platform.modules.read',
  ),
  getCompanyModules,
)

router.patch(
  '/:id/modules/:moduleId/activate',
  platformAuthMiddleware,
  requirePlatformPermission(
    'platform.modules.manage',
  ),
  activateCompanyModule,
)

router.patch(
  '/:id/modules/:moduleId/deactivate',
  platformAuthMiddleware,
  requirePlatformPermission(
    'platform.modules.manage',
  ),
  deactivateCompanyModule,
)

export default router