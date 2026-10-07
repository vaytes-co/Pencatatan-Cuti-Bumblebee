import { Router } from 'express'

import {
  platformLogin,
  platformMe,
  platformLogout,
} from '../controllers/platform-auth.controller.js'

import { platformAuthMiddleware } from '../middlewares/platform-auth.middleware.js'

const router = Router()

router.post('/login', platformLogin)

router.get(
  '/me',
  platformAuthMiddleware,
  platformMe,
)

router.post(
  '/logout',
  platformAuthMiddleware,
  platformLogout,
)

export default router