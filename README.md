# Tasks — Self-hosted TODO App

A full-stack TODO app with login, Work/Personal categories, priority levels,
deadlines, automatic Pending/Completed sorting, search & filter, and task
sharing between users.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS (static build, served by Nginx/Express)
- **Backend:** Node.js 22 + Express + `pg` (raw SQL, no ORM)
- **Database:** PostgreSQL 16
- **Auth:** JWT + bcrypt (username/password)
- **Process manager:** PM2
- **Reverse proxy:** Nginx

Matches this architecture:

```
Browser -> Nginx (80/443) -> Reverse Proxy -> PM2 -> Node.js/Express (3000) -> PostgreSQL (5432)
```

## Features

- Work / Personal categorization
- Pending / Completed lists — completing a task automatically moves it
- High / Medium / Low priority
- Tasks auto-sorted by priority, then by deadline
- Deadlines with overdue/today/tomorrow highlighting
- Create, update, delete tasks
- Search (title + notes) and filter (category, priority, mine/shared)
- Share individual tasks with other registered users
- Responsive layout (mobile + desktop)
- Optimistic UI — checking off a task updates instantly, syncs in the background

## Local development

**Backend**
```bash
cd backend
cp .env.example .env    # edit with your local Postgres credentials
npm install
psql -U <user> -d <database> -f schema.sql
npm run dev              # http://localhost:3000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173, proxies /api to :3000
```

## Project structure

```
todo-app/
├── backend/
│   ├── db/pool.js          PostgreSQL connection pool
│   ├── middleware/auth.js  JWT verification
│   ├── routes/auth.js      register / login / me
│   ├── routes/tasks.js     CRUD, search/filter, sharing
│   ├── schema.sql          Database schema
│   ├── server.js           Express app entrypoint
│   ├── ecosystem.config.js PM2 process definition
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/client.js    fetch wrapper + auth token handling
    │   └── components/      AuthScreen, Dashboard, TaskForm, TaskItem, ShareModal, FilterBar
    └── vite.config.js
```

See `DEPLOYMENT.md` for pushing this to your own server.
