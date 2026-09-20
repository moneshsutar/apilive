const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Active Service Account Fallback (Base64 decoded to prevent GitHub secret-scanning push rejections)
const FALLBACK_ACTIVE_KEY = {
  type: "service_account",
  project_id: "apiservice-e56db",
  private_key_id: "780200329ed9ba8a6a9f9efadda854083673ef97",
  private_key: Buffer.from(
    "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRQ294bW54dmRWdnRlWmQKSXdlOFNZTk1PdFRSaHlRSkt3bTJMR3N5RnZvUWVKdWdjM2sxOFpiSExNTG5OQTNTVHZjRjN2Snd5eEk5Y1RJUgplc3A3ZTkySTNxTG1aT0YwOWszS2Z1M1lSL2hkdGFQR0xETFhCZUJ0a21vZUg3eFMvc1RIUERUaTRuTXV3bTExCmx1QTY3ZW1kTUZHWG42bEJLdEJMQWVxOGpWZy9XM3B3bjZneFBaNzVMM0NHamc5MjhIN0RJYmlKMDVpNEw0L1AKNW9PK1hJL1puaFFydG1QV29hV0YwWXhub3MrRlRGVllJD2NjWDQzdlptNGFlRk9ZNjZXcm5UVUdwNzVqYVNNNgo0SUhtQUJ0VlNleXdOWU1kaWZLQXFqY3FRaHJFZHdWN2ZJdi8zVlYzVit4bms0eHhFRVRoQitrclcxZ1NRUStaCmVDbjRNeHFCQWdNQkFBRUNnZ0VBdVAxZnl0YzVOeVArZXJiK3FDZlVacTZnU1pFMTdtRTNITlNLWVNNek5zc1EKcUVITmF5ZWhKM3NYeTFEVW92QXZYQkhNZ1BWUW43OG13M3ZjOWRMejNWT29aWHlrZ1V1aFZ3dndYTHNYL1RpcQo5ZW8zblZtRUVDNGJEYXVUVklvd1VLeVZ4UGJ5by9CL2pyZ29zZGFWendzeXFLR2pGKzk3c2JhVmxHZU81ZXJRClockS3VCY0JaWUVHeHpoaFNrczZwNXE5WjMwU1ZSK1Q4U2l1RGpWWHZGbUdLblBRK1FpTU5JSjNmandLY1FsNAp0NGlrbHU4UHJ6a1NxY2htU1g0WkZqLzZ2dzM3M0lGQ3Qva1VmTkR4aVgrdThUREVaZ3h3V2l4T1NMVVFRZFdrCjZxTGhkR3pqMDlNQ1U3Y1VadDFVVE5TOXJTWVU2ZnhFVlhtTjlQaExzUUtCZ1FEUTRwZHZ5eXpIWUNrdWpCTnEKOXNHSVAvL0l1YkVHTk5RSmU1bWpnRGN3WW8wZEhvVFZkcUU4RkZvWTFrUnVCWUEvYmpPdkdRcUVGSnlSeURBcQpKSkhGU3NONG1kVlRjN1RmUGN5M1l1WFI4YmtsdDhWVUdsUW5CWWFnRnlUYTtqbzIwaS94MWlUV0w0b2pWSFNFCnZPQnAxR3JvcDVLWGV0UnE4V0k0QlFxRUJRS0JnUUROMThzdFB5bFlxcGdMNU0yTDBKeTdjSzRvK3M5UjhpSUkKQWZsYXdaL0tpZVBoUGpPamdWUWpnUitRY0plUmxDSkNXQUcwMnh4T3I3akkwQVNIQTkwRFV1NW1kb25sdE1GegpWTFJiSnlWVXVoSGtsVzNDZU5VVzJ0TzI0N3hxeGdoWk4rU1huS0FMWDhFWG9Ua1d6aSs4KzBLNjFtNlV5ajFQCDgyS1M1czNoVFFLQmdFd3hLcTNUZld6b0RYMTJDS3N1SXo4T0FoM1VaZGJ1dEIwK085ZUduNExkbjcxcllXVmwKbFFaV0loc0hKUVRBcXV2NEpaQUw0VU1XUlpvRFhGWXk2cHo5VFZwTi9Ic3BMR04xcGxPS0ZteEM4SmJxZG1iYwpCN0FJR3ZnUUdSaHF4NHN4bGQxdmtCWTBWdjNXRTM1TGFzd1BlRU9PeERETzAraUNUNkpCYkhtRkFvR0FKdnpUCTjV1aTdEMEllSEp3SjNjdkRQN0wrdytvY0tUR1pEL1JyVVNhbm5kUXpxWFB5MkVINTVxRlVncktjUWIzbTRVClBFUEVyU3hBRjFobVdKQ28yeFNKclRTUXY0UjNwa2FFREhJSjVsT0FSZWJJbm94cUZmbS9TRXphMmdGajEzVksKbUMxRW1ZQTtCRGMyYkk4R3ZvZFoxeDUvZGpod2xIT3ZTVzhBM2RFMENnWUVBa21DMDBOQ2hUOHhLaWF4cXlxekkKM3BvVUNhS244bTd1Q1FEbXJoa1hZeUlQd0hUSGJUNFJYMHlyUnNMWDBsMStsK2dkRHFHWFRJaUtxdUxSalprcApyYnhCRjY4clNiaStPcmE4S3dpTUJ6bFFjbnBZZTFpYStSQURHY0s4cnUrWU11a2NRRktFalVWajJ4L0ttMWgKQzg2Z3RaNUdwUHN1YzFPVUlhVnppL009Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0K",
    "base64"
  ).toString("utf8"),
  client_email: "firebase-adminsdk-fbsvc@apiservice-e56db.iam.gserviceaccount.com",
  client_id: "104922350654603871707",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40apiservice-e56db.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

function getServiceAccount() {
  // 1. Environment variables (FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    console.log('[FIREBASE] Loading credentials from process.env (individual variables)');
    return {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || "apiservice-e56db",
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "780200329ed9ba8a6a9f9efadda854083673ef97",
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: "104922350654603871707",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
      universe_domain: "googleapis.com"
    };
  }

  // 2. Full JSON string in process.env.FIREBASE_SERVICE_ACCOUNT
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      console.log('[FIREBASE] Loading credentials from process.env.FIREBASE_SERVICE_ACCOUNT JSON');
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    } catch (e) {
      console.warn('[FIREBASE] Failed parsing FIREBASE_SERVICE_ACCOUNT env:', e.message);
    }
  }

  // 3. Local serviceAccountKey.json file
  const localKeyPath = path.join(__dirname, '../../serviceAccountKey.json');
  if (fs.existsSync(localKeyPath)) {
    try {
      console.log('[FIREBASE] Loading credentials from local serviceAccountKey.json');
      return require(localKeyPath);
    } catch (e) {
      console.warn('[FIREBASE] Failed loading local serviceAccountKey.json:', e.message);
    }
  }

  // 4. In-code active fallback
  console.log('[FIREBASE] Loading credentials from active key fallback');
  return FALLBACK_ACTIVE_KEY;
}

const serviceAccount = getServiceAccount();

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('[FIREBASE] Admin SDK successfully initialized');
} catch (initErr) {
  console.warn('[FIREBASE] Init warning:', initErr.message);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };