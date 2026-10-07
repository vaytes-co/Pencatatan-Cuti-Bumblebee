import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/auth.routes.js'
import { authMiddleware } from './middlewares/auth.middleware.js'
import platformAuthRoutes from './routes/platform-auth.routes.js'
import employeeRoutes from './routes/employee.routes.js'

const app = express()

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      'http://localhost:5173',
    credentials: true,
  }),
)

app.use(express.json())

app.use(
  express.urlencoded({
    extended: true,
  }),
)

app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Leave Management API is running',
  })
})

app.get(
  '/api/test-auth',
  authMiddleware,
  (req, res) => {
    const user = (req as any).user

    return res.json({
      success: true,
      message: 'Middleware auth berhasil.',
      data: {
        user,
      },
    })
  },
)

app.use('/api/auth', authRoutes)
app.use(
  '/api/platform/auth',
  platformAuthRoutes,
)
app.use('/api/employees', employeeRoutes)

export default app