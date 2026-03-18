import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/** Benutzerliste (für Projekt-Admin: Benutzer zum Hinzufügen suchen) */
router.get('/', authenticate, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, created_at FROM users ORDER BY username
  `).all();
  res.json({ users });
});

export default router;
