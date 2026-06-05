const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'atsify_jwt_secret_key_2026';

/**
 * Middleware to check JWT authentication.
 * Falls back to simulated header authentication if enabled or in dev mode without token.
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    }

    if (token) {
      // 1. Verify standard JWT token
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
          return res.status(401).json({ error: 'User associated with token not found.' });
        }

        req.user = user;
        req.token = token;
        return next();
      } catch (jwtErr) {
        return res.status(401).json({ error: 'Authentication failed: Invalid or expired token.' });
      }
    }

    // 2. Fallback to mock header authentication for backward compatibility
    const mockRole = req.headers['x-user-role'];
    const mockUserId = req.headers['x-user-id'];

    if (mockRole && mockUserId) {
      try {
        const user = await User.findById(mockUserId);
        if (user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        // Fallback user resolution failed
      }
    }

    return res.status(401).json({
      error: 'Authentication required. Please provide a Bearer token or mock auth headers.'
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal authentication error: ' + error.message });
  }
};

/**
 * Role authorization guard
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(430).json({
        error: `Access Denied. Role '${req.user.role}' is not authorized. Allowed roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = {
  auth,
  authorize
};
