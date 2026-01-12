#!/usr/bin/env node
/**
 * Generate a secure session secret for production use
 */

import crypto from 'crypto';

// Generate a random 64-byte hex string
const secret = crypto.randomBytes(64).toString('hex');

console.log('\n🔐 Secure Session Secret Generated!\n');
console.log('Add this to your .env file:\n');
console.log(`SESSION_SECRET=${secret}\n`);
console.log('Keep this secret safe and never commit it to version control!\n');
