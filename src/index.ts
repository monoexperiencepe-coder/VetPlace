import 'dotenv/config'
import express from 'express'
import { startScheduler } from './jobs/scheduler'
import { errorHandler } from './middleware/errorHandler'
import usersRouter from './routes/users.router'
import petsRouter from './routes/pets.router'
import bookingsRouter from './routes/bookings.router'

const app = express()
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// Routers
app.use('/api/users',    usersRouter)
app.use('/api/pets',     petsRouter)
app.use('/api/bookings', bookingsRouter)

// Error handler — debe ir al final, después de todos los routers
app.use(errorHandler)

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`[Server] Puerto ${PORT}`)
  startScheduler()
})
