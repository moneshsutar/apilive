const admin = require('firebase-admin');

/**
 * Format private key from environment variable
 * Handles all formats: raw with real newlines, escaped \\n, or wrapped in quotes
 */
function formatPrivateKey(key) {
  if (!key) return undefined;

  let formatted = key.trim();

  // Strip leading and trailing quotes if pasted with quotes
  while (
    (formatted.startsWith('"') && formatted.endsWith('"')) ||
    (formatted.startsWith("'") && formatted.endsWith("'"))
  ) {
    formatted = formatted.slice(1, -1).trim();
  }

  // Convert escaped newlines to real newlines and remove carriage returns
  formatted = formatted.replace(/\\n/g, '\n').replace(/\r/g, '');

  return formatted;
}

/**
 * Load Firebase Admin credentials strictly from environment variables
 */
function getCredentialsFromEnv() {
  // Method 1: Full JSON string in FIREBASE_SERVICE_ACCOUNT (or base64 encoded JSON)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      // Check if base64 encoded
      if (!raw.startsWith('{')) {
        raw = Buffer.from(raw, 'base64').toString('utf8');
      }
      const parsed = JSON.parse(raw);
      if (parsed.private_key) {
        parsed.private_key = formatPrivateKey(parsed.private_key);
      }
      console.log('[FIREBASE] Credentials loaded from process.env.FIREBASE_SERVICE_ACCOUNT');
      return parsed;
    } catch (err) {
      console.warn('[FIREBASE] Error parsing FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
    }
  }

  // Method 2: Individual environment variables
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'apiservice-e56db';

  if (privateKey && clientEmail) {
    console.log('[FIREBASE] Credentials loaded from individual process.env variables');
    return {
      type: 'service_account',
      project_id: projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '780200329ed9ba8a6a9f9efadda854083673ef97',
      private_key: privateKey,
      client_email: clientEmail,
      client_id: process.env.FIREBASE_CLIENT_ID || '104922350654603871707',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
      universe_domain: 'googleapis.com',
    };
  }

  console.error('[FIREBASE] Error: No Firebase credentials found in environment variables!');
  return null;
}

const credentials = getCredentialsFromEnv();

if (credentials) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
    console.log('[FIREBASE] Admin SDK initialized successfully from environment');
  } catch (initErr) {
    console.warn('[FIREBASE] Admin SDK init warning:', initErr.message);
  }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };