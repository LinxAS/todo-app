module.exports = {
    apps: [{
        name: 'linxas-defects',
        script: 'server.js',
        cwd: '/home/developer/defect-tracker/backend',
        instances: 1,
        env: { NODE_ENV: 'production' },
    }],
};
