# Cloudron Package

This app can be installed on [Cloudron](https://cloudron.io) as a self-hosted package.

## Contents

- **Dockerfile.cloudron** – Multi-stage build: builds the Vue frontend, then runs the Node backend serving the static frontend. Uses `gosu` to run as user `node` (UID 1000) and expects writable data under `/app/data`.
- **start.sh** – Entry script that sets `DATABASE_PATH`, `UPLOAD_DIR`, `PUBLIC_DIR`, `PORT`, creates `/app/data/uploads`, fixes ownership of `/app/data`, and starts the app.
- **CloudronManifest.json** – App metadata, `httpPort` 8000, `healthCheckPath` `/api/health`, the **localstorage** addon with **sqlite** so `bauleitung.db` is backed up correctly, and **icon** (`file://icon.png`) for the App Store.
- **icon.svg** / **icon.png** – App icon (256×256) for the Cloudron App Store. To regenerate: `npm run cloudron:icon` (requires `sharp`).

## Install

From this directory (with [Cloudron CLI](https://docs.cloudron.io/packaging/cli/) installed and logged in):

```bash
cloudron install
```

If the server expects a file named `Dockerfile`, copy the Cloudron one:

```bash
cp Dockerfile.cloudron Dockerfile
cloudron install
```

Or build the image locally and install by image:

```bash
docker build -f Dockerfile.cloudron -t your-registry/bauleitung:1.0.0 .
docker push your-registry/bauleitung:1.0.0
cloudron install --image your-registry/bauleitung:1.0.0
```

## Update

```bash
cloudron update
```

## Data

- **Database:** `/app/data/bauleitung.db` (SQLite, included in backups via the addon).
- **Uploads:** `/app/data/uploads` (Excel/CSV import temp files).

Both are in `/app/data` and are backed up by Cloudron.
