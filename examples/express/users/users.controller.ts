import type { Request, Response } from 'express';

export const UsersController = {
  list: (_req: Request, res: Response) => res.json([]),
  findOne: (req: Request, res: Response) => res.json({ id: req.params.id }),
  create: (req: Request, res: Response) => res.status(201).json(req.body),
  update: (req: Request, res: Response) => res.json({ id: req.params.id, ...req.body }),
  remove: (req: Request, res: Response) => res.json({ id: req.params.id, deleted: true }),
};
