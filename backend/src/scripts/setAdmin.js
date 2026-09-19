/**
 * Set Admin Script
 * Sets the admin custom claim on a Firebase Auth user
 *
 * Usage: node src/scripts/setAdmin.js <firebase-uid>
 * Or:    npm run set:admin -- <firebase-uid>
 *
 * The admin claim is set via Firebase Custom Claims — NOT a Firestore field.
 * This ensures the admin role cannot be modified by client-side code.
 */

require('dotenv').config();
const { auth } = require('../config/firebase');

async function setAdmin() {
  const uid = process.argv[2];

  if (!uid) {
    console.error('Usage: node src/scripts/setAdmin.js <firebase-uid>');
    process.exit(1);
  }

  try {
    // Verify user exists
    const user = await auth.getUser(uid);
    console.log(`\n  Found user: ${user.email} (${user.uid})`);

    // Set admin custom claim
    await auth.setCustomUserClaims(uid, { admin: true });

    console.log(`  ✓ Admin claim set successfully`);
    console.log(`\n  Note: The user must sign out and sign back in for the claim to take effect.\n`);

    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`\n  ✗ User not found with UID: ${uid}\n`);
    } else {
      console.error('\n  ✗ Error setting admin claim:', error.message, '\n');
    }
    process.exit(1);
  }
}

setAdmin();
