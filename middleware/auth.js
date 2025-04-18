const jwt = require('jsonwebtoken');

function checkAuth(req, res, next) {
  const token = req.cookies.token; // will now work!
  if (token) {
    try {
      const decoded = jwt.verify(token, 'DhruvBoghani624@#');
      req.user = decoded;
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = checkAuth;
