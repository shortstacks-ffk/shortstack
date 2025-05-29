// generate-secret.ts
import * as crypto from 'crypto';

// Generate a 256-bit (32 byte) random string
const secret = crypto.randomBytes(32).toString('hex');

console.log('Your CRON_SECRET:');
console.log(secret);