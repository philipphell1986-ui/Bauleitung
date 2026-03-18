import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'bauleitung.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS project_users (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    PRIMARY KEY (project_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS user_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name)
  );

  CREATE TABLE IF NOT EXISTS group_users (
    group_id INTEGER NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    connection_type TEXT NOT NULL CHECK (connection_type IN ('glasfaser', 'strom')),
    name TEXT,
    address TEXT,
    street TEXT,
    postal_code TEXT,
    city TEXT,
    tel TEXT,
    email TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_connections_project ON connections(project_id);
  CREATE INDEX IF NOT EXISTS idx_connections_type ON connections(connection_type);
  CREATE INDEX IF NOT EXISTS idx_project_users_user ON project_users(user_id);
  CREATE INDEX IF NOT EXISTS idx_group_users_user ON group_users(user_id);
`);

// Migration: latitude/longitude für connections
try {
  const info = db.prepare('PRAGMA table_info(connections)').all();
  const hasLat = info.some((c) => c.name === 'latitude');
  const hasLng = info.some((c) => c.name === 'longitude');
  if (!hasLat) db.exec('ALTER TABLE connections ADD COLUMN latitude REAL');
  if (!hasLng) db.exec('ALTER TABLE connections ADD COLUMN longitude REAL');
} catch (_) {
  // Spalten existieren bereits oder anderer Fehler – ignorieren
}

// Migration: Bearbeitungsstufen pro Hausanschluss
try {
  const info = db.prepare('PRAGMA table_info(connections)').all();
  const hasStage = info.some((c) => c.name === 'stage');
  if (!hasStage) {
    db.exec(`ALTER TABLE connections ADD COLUMN stage TEXT DEFAULT 'hausbegehung'`);
    db.exec(`UPDATE connections SET stage = 'hausbegehung' WHERE stage IS NULL`);
  }
} catch (_) {
  // Spalte existiert bereits oder anderer Fehler – ignorieren
}

export default db;
