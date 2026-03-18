import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/signup', (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return res.status(409).json({ error: 'E-Mail oder Benutzername bereits vergeben' });
  }

  const hash = bcrypt.hashSync(password, 12);

  const result = db.prepare(
    'INSERT INTO users (email, username, password) VALUES (?, ?, ?)'
  ).run(email, username, hash);

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'Auth nicht konfiguriert (JWT_SECRET fehlt)' });
  }
  const token = jwt.sign(
    { id: result.lastInsertRowid, email, username },
    secret,
    { expiresIn: '24h' }
  );

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, email, username },
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'Auth nicht konfiguriert (JWT_SECRET fehlt)' });
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    secret,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, username: user.username },
  });
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Erfolgreich abgemeldet' });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, username, created_at FROM users WHERE id = ?').get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  }

  res.json({ user });
});

export default router;
