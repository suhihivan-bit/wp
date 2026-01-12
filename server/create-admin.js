/**
 * Create first admin user
 * Run this script once to create an admin account
 */

import { createAdminUser } from './db/auth.js';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
    try {
        const email = process.env.ADMIN_EMAIL || 'admin@example.com';
        const password = process.env.ADMIN_PASSWORD || 'admin123';

        console.log('Creating admin user...');
        console.log('Email:', email);

        const user = await createAdminUser(email, password);

        console.log('✅ Admin user created successfully!');
        console.log('ID:', user.id);
        console.log('Email:', user.email);
        console.log('\nYou can now login with:');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

        process.exit(0);

    } catch (error) {
        if (error.message === 'Email already exists') {
            console.log('⚠️  Admin user already exists!');
            process.exit(0);
        } else {
            console.error('❌ Error creating admin:', error.message);
            process.exit(1);
        }
    }
}

createAdmin();
