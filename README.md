# Bauleitung – Anschluss-Projekte

Fullstack-Webanwendung zur Verwaltung von Anschluss-Projekten (Glasfaser & Strom) mit Express/SQLite-Backend und Vue.js-Frontend.

## Funktionen

- **Projekte:** Mehrere Anschluss-Projekte verwalten, nach Login Projekt wählen oder neues erstellen
- **Hausanschlüsse:** Glasfaser- und Strom-Anschlüsse mit Name, Adresse, Telefon, E-Mail etc.
- **Excel/CSV Import:** Daten aus Excel (.xlsx, .xls) oder CSV importieren
- **CSV Export:** Anschlussdaten als CSV exportieren
- **Benutzergruppen:** Gruppen pro Projekt verwalten, Mitglieder zuweisen

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

### Auth
| Methode | Pfad              | Beschreibung                  |
| ------- | ----------------- | ----------------------------- |
| POST    | /api/auth/signup  | Neuen Benutzer registrieren   |
| POST    | /api/auth/login   | Anmelden                      |
| POST    | /api/auth/logout  | Abmelden                      |
| GET     | /api/auth/me      | Aktuellen Benutzer abrufen    |

### Projekte
| Methode | Pfad                    | Beschreibung                    |
| ------- | ----------------------- | ------------------------------- |
| GET     | /api/projects           | Eigene Projekte                 |
| GET     | /api/projects/:id       | Einzelnes Projekt               |
| POST    | /api/projects           | Neues Projekt                   |
| PATCH   | /api/projects/:id       | Projekt aktualisieren           |
| DELETE  | /api/projects/:id       | Projekt löschen                 |
| GET     | /api/projects/:id/users | Benutzer des Projekts           |

### Hausanschlüsse
| Methode | Pfad                                    | Beschreibung              |
| ------- | --------------------------------------- | ------------------------- |
| GET     | /api/connections/project/:projectId     | Anschlüsse eines Projekts |
| GET     | /api/connections/:id                    | Einzelner Anschluss        |
| POST    | /api/connections                        | Neuer Anschluss           |
| PATCH   | /api/connections/:id                    | Anschluss aktualisieren   |
| DELETE  | /api/connections/:id                    | Anschluss löschen         |
| POST    | /api/connections/import/:projectId       | Excel/CSV Import          |
| GET     | /api/connections/export/csv/:projectId  | CSV Export                |

### Benutzergruppen
| Methode | Pfad                          | Beschreibung              |
| ------- | ----------------------------- | ------------------------- |
| GET     | /api/groups/project/:projectId| Gruppen eines Projekts    |
| GET     | /api/groups/:id               | Gruppe mit Mitgliedern    |
| POST    | /api/groups                   | Neue Gruppe               |
| PATCH   | /api/groups/:id               | Gruppe aktualisieren      |
| DELETE  | /api/groups/:id               | Gruppe löschen            |
| POST    | /api/groups/:id/members       | Mitglied hinzufügen       |
| DELETE  | /api/groups/:id/members/:userId| Mitglied entfernen       |

## Excel/CSV Import

Unterstützte Spaltennamen (Groß-/Kleinschreibung variabel):
- Name, Vorname, Nachname
- Adresse, Straße, PLZ, Ort
- Telefon, E-Mail
- Notizen

## Technologien

- **Backend:** Express, better-sqlite3, JWT, bcryptjs, multer, xlsx
- **Frontend:** Vue 3, Vite, Vue Router, Pinia, Axios
