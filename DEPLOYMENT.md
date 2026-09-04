# Deployment — SUSE Linux server (Nginx + PM2 + PostgreSQL 16)

This matches the architecture you already provisioned:
`Browser -> Nginx (80/443) -> Reverse Proxy -> PM2 -> Node.js/Express (3000) -> PostgreSQL (5432)`

## 1. Push to GitHub (from your dev machine)

```bash
cd todo-app
git init
git add .
git commit -m "Initial commit: TODO app"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## 2. Pull onto your server

```bash
ssh <user>@<your-server>
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

## 3. Set up the database

```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE todoapp;
CREATE USER todoapp_user WITH PASSWORD 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON DATABASE todoapp TO todoapp_user;
\q
```
```bash
psql -U todoapp_user -d todoapp -h localhost -f backend/schema.sql
```

## 4. Configure and start the backend

```bash
cd backend
cp .env.example .env
nano .env
```
Set at minimum: `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `JWT_SECRET` (generate
with `openssl rand -hex 32`), and `CORS_ORIGIN` to your site's public URL
(e.g. `https://tasks.example.com`) — or leave it same-origin, see step 6.

```bash
npm install --omit=dev
```

## 5. Build the frontend

```bash
cd ../frontend
npm install
npm run build
```
This produces `frontend/dist/`. The Express server in `server.js` already
serves this directory automatically, so Nginx only needs to proxy to Node —
no separate static site config required.

## 6. Start with PM2

```bash
cd ../backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # follow the printed instructions once, so PM2 survives reboots
```

Since PM2 is already configured to start on boot, `pm2 save` after this first
start is what persists this app across reboots.

## 7. Nginx reverse proxy

Add a server block (e.g. `/etc/nginx/sites-available/todoapp` or the SUSE
equivalent `/etc/nginx/vhosts.d/todoapp.conf`):

```nginx
server {
    listen 80;
    server_name tasks.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

Add HTTPS (recommended, since login sends passwords) with certbot:
```bash
sudo certbot --nginx -d tasks.example.com
```

## 8. Verify

```bash
curl http://localhost:3000/api/health
pm2 status
pm2 logs todo-app
```
Then visit `https://tasks.example.com` and register your first account.

## Iterating on future changes

Your normal loop from here:

```bash
# locally
git add .
git commit -m "Add feature X"
git push

# on the server
cd <repo-name>
git pull
cd backend && npm install --omit=dev   # only if dependencies changed
cd ../frontend && npm install && npm run build  # only if frontend changed
pm2 restart todo-app
```

Consider wrapping the server-side steps in a small `deploy.sh` once this
pattern feels repetitive:

```bash
#!/bin/bash
set -e
git pull
cd backend && npm install --omit=dev && cd ..
cd frontend && npm install && npm run build && cd ..
pm2 restart todo-app
```

## Schema changes across iterations

When you add a new feature that needs a schema change, add a new numbered
file under `backend/migrations/` (e.g. `001_add_tags.sql`) rather than
editing `schema.sql` in place, and run it manually on the server with
`psql ... -f migrations/001_add_tags.sql`. This keeps a clear history of how
the database evolved alongside your git history.
