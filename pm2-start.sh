#!/bin/bash
PM2=/usr/local/lib/node_modules/pm2/bin/pm2
$PM2 startOrRestart /home/developer/todo-app/backend/ecosystem.config.js || true
$PM2 startOrRestart /home/developer/todo-app/portal/backend/ecosystem.config.js || true
$PM2 startOrRestart /home/developer/todo-app/defect-tracker/backend/ecosystem.config.js || true
exit 0
