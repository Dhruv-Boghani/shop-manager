const jwt = require('jsonwebtoken');
const jwtSecrate = process.env.jwtSecrate;

function checkAuth(req, res, next) {
  const token = req.cookies.token; // will now work!
  if (token) {
    try {
      const decoded = jwt.verify(token, jwtSecrate);
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
