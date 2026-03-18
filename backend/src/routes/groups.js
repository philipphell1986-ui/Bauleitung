import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

function hasProjectAccess(userId, projectId, minRole = 'viewer') {
  const roles = { viewer: 0, member: 1, admin: 2 };
  const row = db.prepare(
    'SELECT role FROM project_users WHERE project_id = ? AND user_id = ?'
  ).get(projectId, userId);
  return row && roles[row.role] >= roles[minRole];
}

/** Alle Gruppen eines Projekts */
router.get('/project/:projectId', authenticate, (req, res) => {
  if (!hasProjectAccess(req.user.id, req.params.projectId)) {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  const groups = db.prepare(`
    SELECT g.*, COUNT(gu.user_id) as member_count
    FROM user_groups g
    LEFT JOIN group_users gu ON g.id = gu.group_id
    WHERE g.project_id = ?
    GROUP BY g.id
    ORDER BY g.name
  `).all(req.params.projectId);
  res.json({ groups });
});

/** Gruppe mit Mitgliedern */
router.get('/:id', authenticate, (req, res) => {
  const group = db.prepare('SELECT * FROM user_groups WHERE id = ?').get(req.params.id);
  if (!group || !hasProjectAccess(req.user.id, group.project_id)) {
    return res.status(404).json({ error: 'Gruppe nicht gefunden' });
  }
  const members = db.prepare(`
    SELECT u.id, u.username, u.email
    FROM users u
    JOIN group_users gu ON u.id = gu.user_id
    WHERE gu.group_id = ?
  `).all(req.params.id);
  res.json({ group: { ...group, members } });
});

/** Neue Gruppe erstellen */
router.post('/', authenticate, (req, res) => {
  const { project_id, name, description } = req.body;
  if (!project_id || !name?.trim()) {
    return res.status(400).json({ error: 'project_id und name erforderlich' });
  }
  if (!hasProjectAccess(req.user.id, project_id, 'admin')) {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  try {
    const result = db.prepare(
      'INSERT INTO user_groups (project_id, name, description) VALUES (?, ?, ?)'
    ).run(project_id, name.trim(), description?.trim() || null);
    const group = db.prepare('SELECT * FROM user_groups WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ group });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Gruppenname existiert bereits in diesem Projekt' });
    }
    throw e;
  }
});

/** Gruppe aktualisieren */
router.patch('/:id', authenticate, (req, res) => {
  const group = db.prepare('SELECT * FROM user_groups WHERE id = ?').get(req.params.id);
  if (!group || !hasProjectAccess(req.user.id, group.project_id, 'admin')) {
    return res.status(404).json({ error: 'Gruppe nicht gefunden' });
  }
  const { name, description } = req.body;
  const updates = [];
  const values = [];
  if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description?.trim() || null); }
  if (updates.length > 0) {
    values.push(req.params.id);
    db.prepare(`UPDATE user_groups SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  const updated = db.prepare('SELECT * FROM user_groups WHERE id = ?').get(req.params.id);
  res.json({ group: updated });
});

/** Gruppe löschen */
router.delete('/:id', authenticate, (req, res) => {
  const group = db.prepare('SELECT * FROM user_groups WHERE id = ?').get(req.params.id);
  if (!group || !hasProjectAccess(req.user.id, group.project_id, 'admin')) {
    return res.status(404).json({ error: 'Gruppe nicht gefunden' });
  }
  db.prepare('DELETE FROM user_groups WHERE id = ?').run(req.params.id);
  res.json({ message: 'Gruppe gelöscht' });
});

/** Benutzer zu Gruppe hinzufügen */
router.post('/:id/members', authenticate, (req, res) => {
  const group = db.prepare('SELECT * FROM user_groups WHERE id = ?').get(req.params.id);
  if (!group || !hasProjectAccess(req.user.id, group.project_id, 'admin')) {
    return res.status(404).json({ error: 'Gruppe nicht gefunden' });
  }
  const rawUserId = req.body.user_id;
  if (rawUserId === undefined || rawUserId === null || rawUserId === '') {
    return res.status(400).json({ error: 'user_id erforderlich' });
  }
  const user_id = parseInt(rawUserId, 10);
  if (isNaN(user_id)) {
    return res.status(400).json({ error: 'Ungültige user_id' });
  }
  const hasAccess = hasProjectAccess(user_id, group.project_id);
  if (!hasAccess) {
    return res.status(400).json({ error: 'Benutzer hat keinen Zugriff auf dieses Projekt' });
  }
  try {
    db.prepare('INSERT INTO group_users (group_id, user_id) VALUES (?, ?)').run(parseInt(req.params.id, 10), user_id);
    res.status(201).json({ message: 'Mitglied hinzugefügt' });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Benutzer ist bereits in der Gruppe' });
    }
    console.error('Fehler beim Hinzufügen zu Gruppe:', e);
    return res.status(500).json({ error: e.message || 'Interner Serverfehler' });
  }
});

/** Benutzer aus Gruppe entfernen */
router.delete('/:id/members/:userId', authenticate, (req, res) => {
  const group = db.prepare('SELECT * FROM user_groups WHERE id = ?').get(req.params.id);
  if (!group || !hasProjectAccess(req.user.id, group.project_id, 'admin')) {
    return res.status(404).json({ error: 'Gruppe nicht gefunden' });
  }
  db.prepare('DELETE FROM group_users WHERE group_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ message: 'Mitglied entfernt' });
});

export default router;
