# E-Patti

Teen Patti **score tracking** and **settlement calculation**. E-Patti records winners and losers, totals points, prepares who-owes-whom instructions, and exports a spreadsheet-style PDF. It never processes, holds, or transfers real money.

The website (Next.js) and mobile app (Expo) share one Node.js API. All records are stored as JSON files. There is no database.

## Architecture

```text
e-patti-app/
├── packages/
│   ├── shared/     Scoring, settlement, Zod schemas, TypeScript types
│   ├── backend/    Express REST API + JSON file store + PDF export
│   ├── web/        Next.js website (App Router + Tailwind)
│   └── mobile/     Expo (Android / iOS)
├── data/           Runtime JSON (gitignored user data)
│   ├── users/users.json
│   ├── games/<game-id>.json
│   └── backups/
├── generated/pdf/  Temporary PDF files
└── docker-compose.yml
```

Business rules live in `packages/shared` so the API, website preview, and mobile preview use the same calculations. Totals on disk are always derived from saved rounds; the API never trusts client-submitted net scores.

## Prerequisites

- Node.js 20+
- npm 10+
- For mobile: Expo Go on a phone, or Android Studio / Xcode

## Setup

```bash
cp .env.example .env
npm install
npm run build:shared
npm test
npm run dev
```

- API: http://localhost:4000 (docs at http://localhost:4000/docs)
- Website: http://localhost:3000

Default JSON directories are `./data` and `./generated` at the repository root. In production set `DATA_DIR` and `GENERATED_DIR` to a persistent volume.

## Environment variables

See `.env.example`. Important keys:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Signing secret for session tokens |
| `DATA_DIR` | Root for `users/`, `games/`, `backups/` |
| `GENERATED_DIR` | Temporary PDF output |
| `CORS_ORIGIN` | Allowed website origin in production |
| `NEXT_PUBLIC_API_URL` | Website API base, including `/api` |
| `EXPO_PUBLIC_API_URL` | Mobile API base |

Never commit `.env`, password hashes, game files, or generated PDFs.

## Authentication

- Register: full name, mobile number, password, confirm password
- Login: mobile number and password
- Passwords are hashed with Argon2id
- Sessions use Bearer JWTs
- Login is rate limited
- Games are private to the creating user

## Scoring and settlement

Default rule: `winnerTakesLosses`. Exactly one winner per round. Each loser enters non-negative loss points. The winner receives the sum of those losses. Every round sums to zero.

A game may have 2–8 uniquely named players and at most 50 rounds.

If `pointsToMoneyRate` is set, net points are converted to rupees. If it is omitted, settlement stays in points. The greedy matcher pairs largest remaining payer with largest remaining receiver so payable equals receivable.

Completed games are read-only until explicitly reopened.

## API

All game endpoints require `Authorization: Bearer <token>`.

**Authentication**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`

**Games**
- `POST /api/games`
- `GET /api/games`
- `GET /api/games/:gameId`
- `PATCH /api/games/:gameId`
- `DELETE /api/games/:gameId`
- `POST /api/games/:gameId/complete`
- `POST /api/games/:gameId/reopen`
- `GET /api/games/:gameId/summary`
- `GET /api/games/:gameId/settlement`
- `GET /api/games/:gameId/export/pdf`

**Rounds**
- `POST /api/games/:gameId/rounds`
- `GET /api/games/:gameId/rounds`
- `GET /api/games/:gameId/rounds/:roundId`
- `PATCH /api/games/:gameId/rounds/:roundId`
- `DELETE /api/games/:gameId/rounds/:roundId`

Interactive documentation: http://localhost:4000/docs

## File storage

Each game is one JSON file named by its UUID. Users live in a single `users.json`. Writes:

1. Take an in-process queue plus exclusive lock file
2. Copy the previous file into `data/backups/` (last 10 kept per game)
3. Write a sibling `.tmp` file
4. Replace the destination atomically

Interrupted writes leave the previous JSON intact. Path traversal is blocked; only safe identifiers are used in filenames. The `data/` directory is never served as static files.

**Limits:** this design fits a single API process with a persistent disk. Multiple API replicas can corrupt files if they share the folder without an external lock manager. Serverless or ephemeral disks will lose data unless a mounted volume is used. For large multi-tenant traffic, move to a database.

### Backup procedure

1. Stop or quiesce the API if you need a consistent snapshot.
2. Copy the entire `DATA_DIR` tree (`users`, `games`, `backups`).
3. Store the copy on a separate volume or object store.
4. Restore by replacing `DATA_DIR` and restarting the API.

Automatic per-write backups already live in `data/backups/`.

## Website

```bash
npm run dev:web
```

Responsive dashboard, game rooms, round entry, history, settlement, and PDF download. Tailwind styling matches the mobile palette (forest, gold, cream).

## Mobile app

The Expo app is **not** part of the npm workspaces (React Native and Next.js pin different React versions). Install it separately:

```bash
cd packages/mobile
npm install
npx expo start
```

Then scan the QR code with Expo Go.

API URL tips:

- iOS simulator: `http://localhost:4000/api`
- Android emulator: `http://10.0.2.2:4000/api`
- Physical device: `http://YOUR_LAN_IP:4000/api` and set `EXPO_PUBLIC_API_URL`

PDF export uses the device share sheet.

## Tests

```bash
npm test
```

Coverage includes registration/login, player limits, valid and invalid rounds, cumulative totals after edits/deletes, the 50-round cap, settlement matching, PDF export, concurrent round writes, JSON persistence, and unauthorized access.

## Docker deployment

```bash
cp .env.example .env
# set a long JWT_SECRET
docker compose up --build
```

The API container mounts named volumes at `/data` and `/generated` so JSON files survive restarts. Point `CORS_ORIGIN` and `NEXT_PUBLIC_API_URL` at the public hostnames you use.

Production checklist:

- Use a long random `JWT_SECRET`
- Serve the API behind HTTPS
- Restrict CORS to the website origin
- Put `DATA_DIR` on a persistent disk
- Do not expose `/data` or `/generated` publicly
- Schedule copies of `DATA_DIR`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Shared watch + API + website |
| `npm run dev:api` | API only |
| `npm run dev:web` | Website only |
| `npm run dev:mobile` | Expo |
| `npm test` | Shared + API tests |
| `npm run build` | Production build of shared, API, and website |
