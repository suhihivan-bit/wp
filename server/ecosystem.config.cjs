// PM2 Ecosystem Configuration
// Supports multiple sites on one server

module.exports = {
    apps: [
        {
            name: 'consultation-booking-site1',
            cwd: '/var/www/consultation-booking/server',
            script: 'server.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '300M',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            log_file: './logs/combined.log',
            time: true
        }

        // Add more sites as needed:
        /*
        {
          name: 'consultation-booking-site2',
          cwd: '/var/www/another-booking-site/server',
          script: 'server.js',
          env: {
            NODE_ENV: 'production',
            PORT: 3002
          }
        },
        {
          name: 'consultation-booking-site3',
          cwd: '/var/www/yet-another-site/server',
          script: 'server.js',
          env: {
            NODE_ENV: 'production',
            PORT: 3003
          }
        }
        */
    ]
};
