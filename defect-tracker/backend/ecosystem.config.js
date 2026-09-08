module.exports = {
    apps: [{
        name: 'linxas-defects',
        script: 'server.js',
        cwd: '/home/developer/todo-app/defect-tracker/backend',
        instances: 1,
        env: { NODE_ENV: 'production' },
    }],
};
