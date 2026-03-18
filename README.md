# Bauleitung

Fullstack-Webanwendung mit Express/SQLite-Backend und Vue.js-Frontend.

## Voraussetzungen

- Node.js >= 18 (empfohlen: LTS via [nvm](https://github.com/nvm-sh/nvm))

## Installation

```bash
npm run install:all
```

## Entwicklung starten

```bash
npm run dev
```

Startet Backend (Port 3000) und Frontend (Port 5173) gleichzeitig mit Hot Reload.

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

## API Endpunkte

| Methode | Pfad              | Beschreibung                  |
| ------- | ----------------- | ----------------------------- |
| POST    | /api/auth/signup  | Neuen Benutzer registrieren   |
| POST    | /api/auth/login   | Anmelden                      |
| POST    | /api/auth/logout  | Abmelden                      |
| GET     | /api/auth/me      | Aktuellen Benutzer abrufen    |
| GET     | /api/health       | Health Check                  |

## Technologien

- **Backend:** Express, better-sqlite3, JWT, bcryptjs
- **Frontend:** Vue 3, Vite, Vue Router, Pinia, Axios
