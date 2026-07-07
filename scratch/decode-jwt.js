require('dotenv').config({ path: '.env' });
const jwt = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!jwt) {
  console.error('No service role key found');
  process.exit(1);
}

const parts = jwt.split('.');
if (parts.length !== 3) {
  console.error('Invalid JWT format');
  process.exit(1);
}

const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
console.log('Decoded JWT payload:', payload);
