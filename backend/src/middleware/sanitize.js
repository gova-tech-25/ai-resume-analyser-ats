const sanitizeInput = (val) => {
  if (val instanceof Object) {
    for (const key in val) {
      if (/^\$/.test(key)) {
        console.warn(`[SECURITY] Sanitized potential NoSQL injection: ${key}`);
        delete val[key];
      } else {
        sanitizeInput(val[key]);
      }
    }
  }
  return val;
};

const sanitize = (req, res, next) => {
  try {
    if (req.body) sanitizeInput(req.body);
    if (req.query) sanitizeInput(req.query);
    if (req.params) sanitizeInput(req.params);
    next();
  } catch (error) {
    console.error('[ERROR] Sanitization failed:', error.message);
    next();
  }
};

module.exports = sanitize;
