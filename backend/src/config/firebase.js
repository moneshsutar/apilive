const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
let app;

// 1. Check for serviceAccountKey.json candidate file locations
const candidatePaths = [
  path.resolve(__dirname, '../../serviceAccountKey.json'),
  path.resolve(__dirname, '../serviceAccountKey.json'),
  path.resolve(process.cwd(), 'serviceAccountKey.json'),
  path.resolve(process.cwd(), 'backend/serviceAccountKey.json'),
  path.resolve('/etc/secrets/serviceAccountKey.json'), // Render Secret File default mount path
];

const foundPath = candidatePaths.find((p) => fs.existsSync(p));

if (foundPath) {
  console.log(`[FIREBASE] Loading credentials from file: ${foundPath}`);
  const serviceAccount = require(foundPath);
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Support pasting the entire serviceAccountKey.json string into Render Environment Variables
  console.log('[FIREBASE] Loading credentials from FIREBASE_SERVICE_ACCOUNT_KEY env variable');
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(rawKey);
  } catch (err) {
    // Try base64 decoded
    const decoded = Buffer.from(rawKey, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decoded);
  }
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS))) {
  console.log(`[FIREBASE] Loading credentials from GOOGLE_APPLICATION_CREDENTIALS file: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  const serviceAccount = require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS));
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  console.log('[FIREBASE] Loading credentials from separate FIREBASE_* environment variables');
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
} else {
  console.warn('[FIREBASE WARNING] No service account key file or environment variable found! Firestore operations will fail with 16 UNAUTHENTICATED.');
  app = admin.initializeApp(
    process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : undefined
  );
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth, app };
