/**
 * Admin authorization middleware
 * Must be used AFTER authenticate middleware
 * Checks admin custom claim from Firebase Auth token
 * Admin role is set via Firebase custom claims — NOT a Firestore field
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  if (!req.user.admin) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }

  next();
}

module.exports = { requireAdmin };
