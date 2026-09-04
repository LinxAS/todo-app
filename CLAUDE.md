# CLAUDE.md — Tasks (TODO App)

Context file for Claude Code. Read this before making changes.

## What this is

A self-hosted, multi-user TODO app with login, Work/Personal categories,
priority levels, deadlines, automatic Pending/Completed sorting, search &
filter, and per-task sharing between users. Built to deploy on the owner's
own SUSE Linux server, not a hosted platform.

## Stack (do not swap without discussion)

- **Frontend:** React 18 + Vite + Tailwind CSS — plain `fetch`, no state
  library, no component library. Static build output served by the Express
  server itself (`frontend/dist`), so Nginx only has to reverse-proxy one
  port.
- **Backend:** Node.js 22 + Express + `pg` (raw SQL, **no ORM** — this is a
  deliberate choice, matches the owner's other project, DefectTrack Pro).
- **Database:** PostgreSQL 16, raw `.sql` files, no migration framework.
- **Auth:** JWT (`jsonwebtoken`) + `bcrypt`, custom middleware — no
  Passport, no Auth0/Clerk.
- **Process manager:** PM2 (`ecosystem.config.js`), single fork instance.
- **Reverse proxy:** Nginx in front of the Node process on port 3000.
- **No Docker.** Everything installs and runs directly on the host, same as
  the existing Lightsail-based projects.

## Architecture

```
Browser -> Nginx (80/443) -> Reverse Proxy -> PM2 -> Node.js/Express (3000) -> PostgreSQL (5432)
```

## Folder structure

```
backend/
  db/pool.js          pg Pool, reads standard PG* env vars
  middleware/auth.js  requireAuth — verifies JWT, sets req.user
  routes/auth.js      POST /register, POST /login, GET /me
  routes/tasks.js     full task CRUD + search/filter + sharing
  schema.sql           source of truth for table structure
  server.js            Express app; also serves frontend/dist as static files
  ecosystem.config.js  PM2 process definition
frontend/
  src/api/client.js         fetch wrapper, attaches JWT from localStorage
  src/components/           AuthScreen, Dashboard, TaskForm, TaskItem,
                             ShareModal, FilterBar, Icons (inline SVG, no icon lib)
  src/App.jsx                auth gate -> Dashboard
```

## Data model

- `users` — id, username (unique), password_hash, created_at
- `tasks` — owner_id, title, description, category (work|personal),
  priority (high|medium|low), status (pending|completed), deadline (date),
  created_at, updated_at, completed_at
- `task_shares` — task_id, shared_with_user_id, can_edit — join table for
  sharing a task with another registered user

Sort order (priority high→low, then deadline ascending, nulls last) is
computed **in SQL** (`ORDER BY` in `routes/tasks.js`), not client-side. Keep
it that way — don't move sorting into React.

Completing a task sets `status='completed'` and stamps `completed_at`;
reopening clears `completed_at`. The frontend does not track "which list" a
task belongs to — it just filters `tasks` by `status` on render.

## Conventions

- Route handlers return `{ error: "message" }` on failure, `{ task }` /
  `{ tasks }` / `{ user }` on success — keep this shape consistent.
- All task-mutating routes go through `assertCanEdit` (owner or
  shared-with-edit-rights) — do not bypass it for new endpoints.
- Only the task **owner** can delete or share/unshare — enforced in the
  route, not just the UI.
- Frontend does **optimistic updates** for the completion checkbox
  (`Dashboard.jsx` → `handleToggle`) — flips local state immediately, syncs
  to the server, rolls back on failure. Preserve this pattern for any other
  action that should feel instant.
- Tailwind color tokens are defined in `frontend/tailwind.config.js`
  (`bg`, `surface`, `ink`, `muted`, `accent`, `priorityHigh/Medium/Low`,
  `danger`, `border`) — use these tokens, don't introduce new raw hex
  values in components.
- No icon library — icons are small inline SVGs in `Icons.jsx`. Add new
  ones there in the same style rather than pulling in a dependency.

## Environment variables (`backend/.env`, never commit)

`PORT`, `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`,
`JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`. See `backend/.env.example`.

## Local dev commands

```bash
# backend
cd backend && npm install && npm run dev        # :3000

# frontend
cd frontend && npm install && npm run dev        # :5173, proxies /api to :3000
```

## Schema changes

Don't hand-edit `schema.sql` for changes after initial deploy. Add a new
numbered file under `backend/migrations/` (create this folder if it
doesn't exist yet, e.g. `001_add_tags.sql`) and note in the PR/commit
message that it needs to be run manually with `psql -f` on the server —
there is no migration runner wired up.

## Deploy

Full steps in `DEPLOYMENT.md`. Short version once already deployed once:

```bash
git pull
cd backend && npm install --omit=dev && cd ..
cd frontend && npm install && npm run build && cd ..
pm2 restart todo-app
```

Never restart via anything other than PM2 (`pm2 restart todo-app`) — don't
suggest `nohup`, `screen`, or a raw `node server.js` for production.

## Things to ask before changing

- Swapping `pg` for an ORM (Prisma/Sequelize/etc.)
- Adding Docker
- Adding a frontend state/data-fetching library (Redux, React Query, etc.)
- Changing the auth approach (e.g. moving to sessions/cookies instead of JWT)
- Any change to how `task_shares` permissions work — this is deliberately
  minimal (owner-only share/unshare, single `can_edit` flag) and any richer
  permission model should be discussed first
