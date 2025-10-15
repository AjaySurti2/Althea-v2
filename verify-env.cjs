#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Environment Configuration\n');

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.error('   Please copy .env.example to .env and add your Supabase credentials.\n');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

const requiredVars = {
  'VITE_SUPABASE_URL': false,
  'VITE_SUPABASE_ANON_KEY': false
};

lines.forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const [key, value] = trimmedLine.split('=');
    if (key && value && requiredVars.hasOwnProperty(key.trim())) {
      requiredVars[key.trim()] = value.trim().length > 0;
    }
  }
});

let allValid = true;

console.log('Environment Variables:');
Object.keys(requiredVars).forEach(key => {
  const isSet = requiredVars[key];
  const status = isSet ? '✅' : '❌';
  console.log(`  ${status} ${key}: ${isSet ? 'SET' : 'NOT SET'}`);
  if (!isSet) allValid = false;
});

console.log('');

if (allValid) {
  console.log('✅ All required environment variables are set!');
  console.log('   You can now run: npm run dev\n');
  process.exit(0);
} else {
  console.error('❌ Missing required environment variables!');
  console.error('   Please update your .env file with the missing values.');
  console.error('   Get your credentials from: https://app.supabase.com\n');
  process.exit(1);
}
