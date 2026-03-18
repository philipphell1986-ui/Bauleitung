import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import connectionRoutes from './routes/connections.js';
import groupRoutes from './routes/groups.js';
import userRoutes from './routes/users.js';

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Fatal: JWT_SECRET must be set in production.');
    process.exit(1);
  }
  process.env.JWT_SECRET = 'dev-secret-change-in-production';
  console.warn('Warning: JWT_SECRET not set, using dev default. Set JWT_SECRET for production.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists (e.g. /app/data/uploads on Cloudron)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch (_) {}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend SPA when PUBLIC_DIR is set (e.g. Cloudron)
const publicDir = process.env.PUBLIC_DIR;
if (publicDir && fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/*path', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Backend läuft auf http://${HOST}:${PORT}`);
});
