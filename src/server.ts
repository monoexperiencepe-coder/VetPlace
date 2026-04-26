import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { startScheduler } from './jobs/scheduler'
import { errorHandler } from './middleware/errorHandler'
import usersRouter from './routes/users.router'
import petsRouter from './routes/pets.router'
import eventsRouter from './routes/events.router'
import bookingsRouter from './routes/bookings.router'
import devRouter from './routes/dev.router'
import statsRouter from './routes/stats.router'

const app = express()
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : []

app.use(cors({
  origin: process.env.NODE_ENV !== 'production'
    ? '*'
    : (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true)
        else callback(new Error('Not allowed by CORS'))
      },
}))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// Routers
app.use('/api/users',    usersRouter)
app.use('/api/pets',     petsRouter)
app.use('/api/events',   eventsRouter)
app.use('/api/bookings', bookingsRouter)
app.use('/api/stats',   statsRouter)

// Solo en desarrollo: disparar jobs manualmente
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRouter)
}

// Error handler — debe ir al final, después de todos los routers
app.use(errorHandler)

const PORT = Number(process.env.PORT ?? 3000)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Escuchando en http://127.0.0.1:${PORT}`)
  startScheduler()
})
