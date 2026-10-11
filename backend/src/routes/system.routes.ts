import { Router } from 'express'

import { authMiddleware } from '../middlewares/auth.middleware.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Leave Management API is running',
  })
})

router.get('/test-auth', authMiddleware, (req, res) => {
  const user = (req as any).user

  return res.json({
    success: true,
    message: 'Middleware auth berhasil.',
    data: {
      user,
    },
  })
})

export default router