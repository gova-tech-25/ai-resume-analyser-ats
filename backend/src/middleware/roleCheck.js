/**
 * Middleware to check simulated roles using headers (since full login auth is disabled).
 * Reads 'x-user-role' and 'x-user-id' from the request headers.
 */
const mockAuth = (req, res, next) => {
  const role = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  if (!role || !userId) {
    return res.status(401).json({
      error: 'Missing simulated auth headers. Please provide x-user-role and x-user-id.'
    });
  }

  // Inject into request object
  req.user = {
    _id: userId,
    role: role
  };
  next();
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Mock auth required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(430).json({
        error: `Access Denied. Role '${req.user.role}' is not authorized. Allowed roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
};

module.exports = {
  mockAuth,
  checkRole
};
