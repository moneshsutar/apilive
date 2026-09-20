const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
let app;

// 1. Check local file (backend/serviceAccountKey.json)
const localPath = path.resolve(__dirname, '../../serviceAccountKey.json');
// 2. Check Render Secret File mount path (/etc/secrets/serviceAccountKey.json)
const renderSecretPath = '/etc/secrets/serviceAccountKey.json';

if (fs.existsSync(localPath)) {
  console.log(`[FIREBASE] Loading credentials from local file: ${localPath}`);
  const serviceAccount = require(localPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else if (fs.existsSync(renderSecretPath)) {
  console.log(`[FIREBASE] Loading credentials from Render Secret File: ${renderSecretPath}`);
  const serviceAccount = require(renderSecretPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.log('[FIREBASE] Loading credentials from FIREBASE_SERVICE_ACCOUNT environment variable');
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.error(`[FIREBASE ERROR] No service account credentials found! Checked ${localPath}, ${renderSecretPath}, and FIREBASE_SERVICE_ACCOUNT env.`);
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth, app };
