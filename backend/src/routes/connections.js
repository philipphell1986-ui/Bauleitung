import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
    else cb(new Error('Nur Excel (.xlsx, .xls) und CSV erlaubt'));
  },
});

const router = Router();

function hasProjectAccess(userId, projectId, minRole = 'viewer') {
  const roles = { viewer: 0, member: 1, admin: 2 };
  const row = db.prepare(
    'SELECT role FROM project_users WHERE project_id = ? AND user_id = ?'
  ).get(projectId, userId);
  return row && roles[row.role] >= roles[minRole];
}

/** CSV Export (vor /:id definieren) */
router.get('/export/csv/:projectId', authenticate, (req, res) => {
  if (!hasProjectAccess(req.user.id, req.params.projectId)) {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  const connections = db.prepare(`
    SELECT connection_type, name, address, street, postal_code, city, tel, email, notes, latitude, longitude, stage
    FROM connections WHERE project_id = ? ORDER BY name, id
  `).all(req.params.projectId);
  const header = ['Typ', 'Name', 'Adresse', 'Straße', 'PLZ', 'Ort', 'Telefon', 'E-Mail', 'Notizen', 'Breitengrad', 'Längengrad', 'Stufe'];
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  const stageLabels = { hausbegehung: 'Hausbegehung', tiefbau: 'Hausanschluss (Tiefbau)', aktivierung: 'Aktivierung des Kunden' };
  for (const c of connections) {
    lines.push([
      c.connection_type,
      escape(c.name),
      escape(c.address),
      escape(c.street),
      escape(c.postal_code),
      escape(c.city),
      escape(c.tel),
      escape(c.email),
      escape(c.notes),
      c.latitude != null ? String(c.latitude) : '',
      c.longitude != null ? String(c.longitude) : '',
      stageLabels[c.stage] || c.stage || 'Hausbegehung',
    ].join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="anschluesse_${req.params.projectId}.csv"`);
  res.send('\uFEFF' + lines.join('\r\n'));
});

/** Alle Anschlüsse eines Projekts */
router.get('/project/:projectId', authenticate, (req, res) => {
  if (!hasProjectAccess(req.user.id, req.params.projectId)) {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  const connections = db.prepare(`
    SELECT * FROM connections WHERE project_id = ? ORDER BY name, id
  `).all(req.params.projectId);
  res.json({ connections });
});

/** Einzelner Anschluss */
router.get('/:id', authenticate, (req, res) => {
  const conn = db.prepare('SELECT * FROM connections WHERE id = ?').get(req.params.id);
  if (!conn || !hasProjectAccess(req.user.id, conn.project_id)) {
    return res.status(404).json({ error: 'Anschluss nicht gefunden' });
  }
  res.json({ connection: conn });
});

/** Neuer Anschluss */
router.post('/', authenticate, (req, res) => {
  const { project_id, connection_type, name, address, street, postal_code, city, tel, email, notes, latitude, longitude, stage } = req.body;
  if (!project_id || !connection_type) {
    return res.status(400).json({ error: 'project_id und connection_type erforderlich' });
  }
  if (!['glasfaser', 'strom'].includes(connection_type)) {
    return res.status(400).json({ error: 'connection_type muss glasfaser oder strom sein' });
  }
  if (!hasProjectAccess(req.user.id, project_id, 'member')) {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  const parseCoord = (v) => {
    if (v == null || v === '') return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);
  const validStage = ['hausbegehung', 'tiefbau', 'aktivierung'].includes(stage) ? stage : 'hausbegehung';
  const result = db.prepare(`
    INSERT INTO connections (project_id, connection_type, name, address, street, postal_code, city, tel, email, notes, latitude, longitude, stage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(project_id, connection_type, name || null, address || null, street || null, postal_code || null, city || null, tel || null, email || null, notes || null, lat, lng, validStage);
  const connection = db.prepare('SELECT * FROM connections WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ connection });
});

/** Anschluss aktualisieren */
router.patch('/:id', authenticate, (req, res) => {
  const conn = db.prepare('SELECT * FROM connections WHERE id = ?').get(req.params.id);
  if (!conn || !hasProjectAccess(req.user.id, conn.project_id, 'member')) {
    return res.status(404).json({ error: 'Anschluss nicht gefunden' });
  }
  const fields = ['connection_type', 'name', 'address', 'street', 'postal_code', 'city', 'tel', 'email', 'notes', 'latitude', 'longitude', 'stage'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      const val = req.body[f];
      if ((f === 'latitude' || f === 'longitude') && (val === '' || val == null)) {
        values.push(null);
      } else if ((f === 'latitude' || f === 'longitude') && val !== null) {
        const n = parseFloat(val);
        values.push(Number.isFinite(n) ? n : null);
      } else if (f === 'stage') {
        values.push(['hausbegehung', 'tiefbau', 'aktivierung'].includes(val) ? val : 'hausbegehung');
      } else {
        values.push(val ?? null);
      }
    }
  }
  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);
    db.prepare(`UPDATE connections SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  const connection = db.prepare('SELECT * FROM connections WHERE id = ?').get(req.params.id);
  res.json({ connection });
});

/** Anschluss löschen */
router.delete('/:id', authenticate, (req, res) => {
  const conn = db.prepare('SELECT * FROM connections WHERE id = ?').get(req.params.id);
  if (!conn || !hasProjectAccess(req.user.id, conn.project_id, 'member')) {
    return res.status(404).json({ error: 'Anschluss nicht gefunden' });
  }
  db.prepare('DELETE FROM connections WHERE id = ?').run(req.params.id);
  res.json({ message: 'Anschluss gelöscht' });
});

/** Excel/CSV Import */
const COLUMN_MAP = {
  name: ['name', 'Name', 'name', 'Vorname Name'],
  address: ['address', 'Adresse', 'adresse', 'Straße Hausnr'],
  street: ['street', 'Straße', 'strasse', 'straße'],
  postal_code: ['postal_code', 'plz', 'PLZ', 'postleitzahl'],
  city: ['city', 'Ort', 'stadt', 'Stadt'],
  tel: ['tel', 'telefon', 'Telefon', 'tel', 'phone'],
  email: ['email', 'Email', 'E-Mail', 'e-mail', 'mail'],
  latitude: ['latitude', 'Breitengrad', 'lat', 'Latitude'],
  longitude: ['longitude', 'Längengrad', 'lng', 'Longitude'],
};

function mapRow(row, connectionType) {
  const get = (keys) => {
    for (const k of keys) {
      const v = row[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return null;
  };
  const parseCoord = (keys) => {
    const v = get(keys);
    if (v == null) return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  return {
    connection_type: connectionType,
    name: get(COLUMN_MAP.name) || get(['Vorname']) ? `${get(['Vorname']) || ''} ${get(['Nachname']) || get(COLUMN_MAP.name) || ''}`.trim() : null,
    address: get(COLUMN_MAP.address) || (get(COLUMN_MAP.street) && get(COLUMN_MAP.postal_code) ? `${get(COLUMN_MAP.street)} ${get(COLUMN_MAP.postal_code)} ${get(COLUMN_MAP.city) || ''}`.trim() : null),
    street: get(COLUMN_MAP.street),
    postal_code: get(COLUMN_MAP.postal_code),
    city: get(COLUMN_MAP.city),
    tel: get(COLUMN_MAP.tel),
    email: get(COLUMN_MAP.email),
    notes: get(['notes', 'Notizen', 'Bemerkung']),
    latitude: parseCoord(COLUMN_MAP.latitude),
    longitude: parseCoord(COLUMN_MAP.longitude),
  };
}

router.post('/import/:projectId', authenticate, upload.single('file'), (req, res) => {
  if (!hasProjectAccess(req.user.id, req.params.projectId, 'member')) {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  const connectionType = req.body.connection_type || 'glasfaser';
  if (!['glasfaser', 'strom'].includes(connectionType)) {
    return res.status(400).json({ error: 'connection_type muss glasfaser oder strom sein' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  }
  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rows = [];
    if (ext === '.csv') {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      const lines = content.split(/\r?\n/).filter(Boolean);
      const header = lines[0].split(/[,;]\s*/).map(h => h.trim().replace(/^["']|["']$/g, ''));
      rows = lines.slice(1).map(line => {
        const values = line.split(/[,;]/).map(v => v.trim().replace(/^["']|["']$/g, ''));
        const obj = {};
        header.forEach((h, i) => { obj[h] = values[i]; });
        return obj;
      });
    } else {
      const wb = XLSX.readFile(req.file.path);
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    }
    const insert = db.prepare(`
      INSERT INTO connections (project_id, connection_type, name, address, street, postal_code, city, tel, email, notes, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const projectId = parseInt(req.params.projectId, 10);
    let imported = 0;
    for (const row of rows) {
      const data = mapRow(row, connectionType);
      if (data.name || data.address || data.tel || data.email) {
        insert.run(projectId, data.connection_type, data.name, data.address, data.street, data.postal_code, data.city, data.tel, data.email, data.notes, data.latitude, data.longitude);
        imported++;
      }
    }
    fs.unlinkSync(req.file.path);
    res.json({ imported, total: rows.length });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400).json({ error: err.message || 'Import fehlgeschlagen' });
  }
});

export default router;
