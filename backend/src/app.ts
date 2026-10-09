import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/auth.routes.js'
import { authMiddleware } from './middlewares/auth.middleware.js'
import employeeRoutes from './routes/employee.routes.js'

import platformAuthRoutes from './routes/platform-auth.routes.js'
import platformCompanyRoutes from './routes/platform-company.routes.js'

import userRoutes from './routes/user.routes.js'
import roleRoutes from './routes/role.routes.js'

import accessManagementRoutes from './routes/access-management.routes.js'

import permissionDelegationRoutes from './routes/permission-delegation.routes.js'

import leaveRoutes from './routes/leave.routes.js'

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
app.use('/api/platform/companies', platformCompanyRoutes)

app.use('/api/employees', employeeRoutes)

app.use(
  '/api/users',
  userRoutes,
)

app.use(
  '/api/roles',
  roleRoutes,
)

app.use(
  '/api/access',
  accessManagementRoutes,
)

app.use(
  '/api/access/delegations',
  permissionDelegationRoutes,
)

app.use('/api/leaves', leaveRoutes)

export default app