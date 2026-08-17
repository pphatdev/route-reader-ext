import { Router } from 'express';

const router = Router();

router.get('/admin/dashboard', (_req, res) => res.json({ widgets: [] }));
router.get('/admin/audit-log', (_req, res) => res.json([]));
router.post('/admin/impersonate/:userId', (req, res) =>
  res.json({ impersonating: req.params.userId }),
);
router.delete('/admin/sessions/:id', (req, res) =>
  res.json({ id: req.params.id, revoked: true }),
);

export { router as adminRouter };
