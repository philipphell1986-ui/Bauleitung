import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/** Projekte des eingeloggten Benutzers */
router.get('/', authenticate, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, pu.role
    FROM projects p
    JOIN project_users pu ON p.id = pu.project_id
    WHERE pu.user_id = ?
    ORDER BY p.name
  `).all(req.user.id);
  res.json({ projects });
});

/** Benutzer eines Projekts (vor /:id) */
router.get('/:id/users', authenticate, (req, res) => {
  const row = db.prepare(`
    SELECT pu.role FROM project_users pu WHERE pu.project_id = ? AND pu.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!row) {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, pu.role
    FROM users u
    JOIN project_users pu ON u.id = pu.user_id
    WHERE pu.project_id = ?
    ORDER BY u.username
  `).all(req.params.id);
  res.json({ users });
});

/** Einzelnes Projekt */
router.get('/:id', authenticate, (req, res) => {
  const project = db.prepare(`
    SELECT p.*, pu.role
    FROM projects p
    JOIN project_users pu ON p.id = pu.project_id AND pu.user_id = ?
    WHERE p.id = ?
  `).get(req.user.id, req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Projekt nicht gefunden oder keine Berechtigung' });
  }
  res.json({ project });
});

/** Neues Projekt erstellen */
router.post('/', authenticate, (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Projektname ist erforderlich' });
  }
  const result = db.prepare(
    'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)'
  ).run(name.trim(), description?.trim() || null, req.user.id);
  const projectId = result.lastInsertRowid;
  db.prepare(
    'INSERT INTO project_users (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(projectId, req.user.id, 'admin');
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  res.status(201).json({ project });
});

/** Projekt aktualisieren (nur admin) */
router.patch('/:id', authenticate, (req, res) => {
  const row = db.prepare(`
    SELECT pu.role FROM project_users pu WHERE pu.project_id = ? AND pu.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!row || row.role !== 'admin') {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  const { name, description } = req.body;
  const updates = [];
  const values = [];
  if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description?.trim() || null); }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben' });
  }
  values.push(req.params.id);
  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json({ project });
});

/** Projekt löschen (nur admin) */
router.delete('/:id', authenticate, (req, res) => {
  const row = db.prepare(`
    SELECT pu.role FROM project_users pu WHERE pu.project_id = ? AND pu.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!row || row.role !== 'admin') {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Projekt gelöscht' });
});

/** Benutzer zu Projekt hinzufügen (admin) */
router.post('/:id/users', authenticate, (req, res) => {
  const row = db.prepare(`
    SELECT pu.role FROM project_users pu WHERE pu.project_id = ? AND pu.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!row || row.role !== 'admin') {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  const { user_id, role = 'member' } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id erforderlich' });
  }
  try {
    db.prepare(
      'INSERT INTO project_users (project_id, user_id, role) VALUES (?, ?, ?)'
    ).run(req.params.id, user_id, role);
    res.status(201).json({ message: 'Benutzer hinzugefügt' });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Benutzer ist bereits im Projekt' });
    }
    throw e;
  }
});

export default router;
