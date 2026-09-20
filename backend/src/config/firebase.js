const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
let app;

// Direct path to serviceAccountKey.json located in the backend folder
const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  console.log(`[FIREBASE] Loading credentials directly from: ${serviceAccountPath}`);
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.error(`[FIREBASE ERROR] serviceAccountKey.json not found at: ${serviceAccountPath}`);
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth, app };
