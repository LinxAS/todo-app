// PM2 process definition. Start with: pm2 start ecosystem.config.js
module.exports = {
    apps: [
        {
            name: 'todo-app',
            script: 'server.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
            },
            max_memory_restart: '300M',
            autorestart: true,
        },
    ],
};
