import cron from 'node-cron'
import { runCheckUpcomingEventsJob } from './checkUpcomingEvents.job'

interface JobDefinition {
  name: string
  expression: string
  timezone?: string
  fn: () => Promise<void>
}

const jobs: JobDefinition[] = [
  {
    name: 'checkUpcomingEvents',
    expression: '0 13 * * *',
    timezone: 'America/Lima',
    fn: runCheckUpcomingEventsJob,
  },
]

export function startScheduler(): void {
  console.log('[Scheduler] Iniciando...')

  for (const job of jobs) {
    if (!cron.validate(job.expression)) {
      console.error(`[Scheduler] Expresión inválida para "${job.name}": ${job.expression}`)
      continue
    }

    cron.schedule(
      job.expression,
      async () => {
        console.log(`[Scheduler] Ejecutando: ${job.name}`)
        try {
          await job.fn()
        } catch (err) {
          console.error(`[Scheduler] Error no capturado en "${job.name}":`, err)
        }
      },
      { timezone: job.timezone, scheduled: true }
    )

    console.log(`[Scheduler] "${job.name}" → ${job.expression} (${job.timezone ?? 'UTC'})`)
  }

  console.log('[Scheduler] Listo.\n')
}

export async function triggerJobNow(jobName: string): Promise<void> {
  const job = jobs.find((j) => j.name === jobName)
  if (!job) throw new Error(`Job desconocido: ${jobName}`)
  console.log(`[Scheduler] Trigger manual: ${jobName}`)
  await job.fn()
}
