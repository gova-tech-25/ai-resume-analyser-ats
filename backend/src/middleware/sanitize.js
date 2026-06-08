const sanitizeInput = (val) => {
  if (val instanceof Object) {
    for (const key in val) {
      if (/^\$/.test(key)) {
        delete val[key];
      } else {
        sanitizeInput(val[key]);
      }
    }
  }
  return val;
};

const sanitize = (req, res, next) => {
  if (req.body) sanitizeInput(req.body);
  if (req.query) sanitizeInput(req.query);
  if (req.params) sanitizeInput(req.params);
  next();
};

module.exports = sanitize;
