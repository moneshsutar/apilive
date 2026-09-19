const { auth } = require('../config/firebase');

/**
 * Authentication middleware
 * Verifies Firebase ID token from Authorization header
 * Attaches decoded user info to req.user
 * NEVER trusts client-supplied userId — always derives from verified token
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);

    // Attach user info from the VERIFIED token — never from client body/params
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      admin: decodedToken.admin || false,
      displayName: decodedToken.name || null,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.code || error.message);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token revoked',
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }
}

module.exports = { authenticate };
