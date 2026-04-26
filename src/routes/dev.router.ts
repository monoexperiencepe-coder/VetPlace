import { Router, Request, Response, NextFunction } from 'express'
import { triggerJobNow } from '../jobs/scheduler'

const router = Router()

// Solo activo en development. En producción no se monta este router.
// POST /api/dev/run-job/:name
router.post('/run-job/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const start = Date.now()
    await triggerJobNow(req.params.name)
    res.json({ ok: true, job: req.params.name, ms: Date.now() - start })
  } catch (err) {
    next(err)
  }
})

export default router
