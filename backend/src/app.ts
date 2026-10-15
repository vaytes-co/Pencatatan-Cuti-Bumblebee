import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import apiRoutes from './routes/index.js'

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

app.use('/api', apiRoutes)

export default app