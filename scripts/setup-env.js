#!/usr/bin/env node
/**
 * Generates secure random values and writes:
 *   .env                    (from env.production.example)
 *   client/.env.production  (from client/env.production.example)
 *
 * Usage:
 *   node scripts/setup-env.js           # skip if .env exists
 *   node scripts/setup-env.js --force   # overwrite
 *   node scripts/setup-env.js --dry-run # print only, no writes
 *   node scripts/setup-env.js --testing # weak fixed secrets for smoke tests only
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FORCE = process.argv.includes('--force');
const DRY = process.argv.includes('--dry-run');
const TESTING = process.argv.includes('--testing');

/** Fixed secrets for local/VPS smoke tests — replace before real production. */
const TESTING_SECRETS = {
  jwt:
    'cityfreshkart-testing-jwt-replace-before-production-min-48-characters-long',
  dbPassword: 'cityfreshkart_test_db_password',
  adminPassword: 'CityFreshTestAdmin2025!',
  razorpayKeyId: 'rzp_test_placeholder_replace_in_dashboard',
  razorpayKeySecret: 'placeholder_razorpay_secret_replace_me',
};

function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function randomPassword(length = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const buf = crypto.randomBytes(length);
  let s = '';
  for (let i = 0; i < length; i += 1) {
    s += chars[buf[i] % chars.length];
  }
  return s;
}

function tryGenerateVapidKeys() {
  const candidates = [
    path.join(ROOT, 'server', 'node_modules', 'web-push'),
    path.join(ROOT, 'node_modules', 'web-push'),
  ];
  for (const wpPath of candidates) {
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      return require(wpPath).generateVAPIDKeys();
    } catch {
      /* try next */
    }
  }
  return null;
}

function replaceAutoPlaceholders(content, { jwt, dbPassword, adminPassword, vapid }) {
  let out = content
    .replace(/__AUTO_JWT_SECRET__/g, jwt)
    .replace(/__AUTO_DB_PASSWORD__/g, dbPassword)
    .replace(/__AUTO_ADMIN_PASSWORD__/g, adminPassword);

  if (vapid) {
    out = out
      .replace(/__AUTO_VAPID_PUBLIC_KEY__/g, vapid.publicKey)
      .replace(/__AUTO_VAPID_PRIVATE_KEY__/g, vapid.privateKey);
  } else {
    out = out
      .replace(/VAPID_PUBLIC_KEY=__AUTO_VAPID_PUBLIC_KEY__/g, '# VAPID_PUBLIC_KEY=')
      .replace(/VAPID_PRIVATE_KEY=__AUTO_VAPID_PRIVATE_KEY__/g, '# VAPID_PRIVATE_KEY=')
      .replace(/REACT_APP_VAPID_PUBLIC_KEY=__AUTO_VAPID_PUBLIC_KEY__/g, '# REACT_APP_VAPID_PUBLIC_KEY=');
  }

  return out;
}

function applyTestingRazorpay(content) {
  return content
    .replace(/__EDIT_RAZORPAY_KEY_ID__/g, TESTING_SECRETS.razorpayKeyId)
    .replace(/__EDIT_RAZORPAY_KEY_SECRET__/g, TESTING_SECRETS.razorpayKeySecret);
}

function readTemplate(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) {
    console.error(`Missing template: ${relativePath}`);
    process.exit(1);
  }
  return fs.readFileSync(full, 'utf8');
}

function writeFile(relativePath, content) {
  const full = path.join(ROOT, relativePath);
  fs.writeFileSync(full, content, 'utf8');
  console.log(`Wrote ${relativePath}`);
}

function main() {
  const jwt = TESTING ? TESTING_SECRETS.jwt : randomHex(48);
  const dbPassword = TESTING ? TESTING_SECRETS.dbPassword : randomPassword(28);
  const adminPassword = TESTING ? TESTING_SECRETS.adminPassword : randomPassword(20);
  const vapid = tryGenerateVapidKeys();

  if (TESTING) {
    console.warn(
      '⚠️  --testing uses WEAK fixed secrets. Replace JWT, DB, admin, Razorpay before real production.',
    );
  }

  if (!vapid) {
    console.warn(
      'Note: web-push not found under server/node_modules — skipping VAPID key generation. Run npm install in server/ and re-run to generate VAPID keys.',
    );
  }

  let rootContent = readTemplate('env.production.example');
  let clientContent = readTemplate('client/env.production.example');

  const secrets = { jwt, dbPassword, adminPassword, vapid };
  rootContent = replaceAutoPlaceholders(rootContent, secrets);
  clientContent = replaceAutoPlaceholders(clientContent, secrets);

  if (TESTING) {
    rootContent = applyTestingRazorpay(rootContent);
  }

  const rootEnv = path.join(ROOT, '.env');
  const clientEnv = path.join(ROOT, 'client', '.env.production');

  if (DRY) {
    console.log('--- .env (dry run) ---\n');
    console.log(rootContent);
    console.log('\n--- client/.env.production (dry run) ---\n');
    console.log(clientContent);
    console.log('\n--- Generated values (save securely) ---');
    console.log('JWT_SECRET (preview):', `${jwt.slice(0, 8)}…`);
    console.log('DB_PASSWORD (preview):', `${dbPassword.slice(0, 4)}…`);
    console.log('ADMIN_PASSWORD (preview):', `${adminPassword.slice(0, 4)}…`);
    if (vapid) console.log('VAPID: generated');
    return;
  }

  if (fs.existsSync(rootEnv) && !FORCE) {
    console.error(`Refusing to overwrite ${path.relative(ROOT, rootEnv)} (use --force).`);
    process.exit(1);
  }
  if (fs.existsSync(clientEnv) && !FORCE) {
    console.error(`Refusing to overwrite ${path.relative(ROOT, clientEnv)} (use --force).`);
    process.exit(1);
  }

  writeFile('.env', rootContent);
  writeFile('client/.env.production', clientContent);

  const reportPath = path.join(ROOT, 'scripts', '.setup-env-report.txt');
  const report = [
    `Generated ${new Date().toISOString()}`,
    '',
    'IMPORTANT: Edit .env and set:',
    '  RAZORPAY_KEY_ID',
    '  RAZORPAY_KEY_SECRET',
    '  CLIENT_URL / CORS_ORIGIN if domain differs',
    '',
    'Keep this file secret or delete after reading:',
    `  JWT_SECRET=${jwt}`,
    `  DB_PASSWORD=${dbPassword}`,
    `  ADMIN_PASSWORD=${adminPassword}`,
    '',
    vapid ? `VAPID_PUBLIC_KEY=${vapid.publicKey}\nVAPID_PRIVATE_KEY=${vapid.privateKey}` : '(VAPID not generated — run from repo with server deps installed)',
    '',
  ].join('\n');

  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\nOne-time secrets copy saved to: ${path.relative(ROOT, reportPath)}`);
  console.log('Delete that file after you store passwords in a password manager.\n');
  if (TESTING) {
    console.log('Testing mode: put Razorpay test keys from dashboard into .env if payments should work.\n');
  } else {
    console.log('Next: edit .env (Razorpay), then npm run build && start server.');
  }
}

main();
