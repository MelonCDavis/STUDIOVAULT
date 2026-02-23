const { verifyToken } = require("./auth.utils");
const { httpError } = require("../../utils/httpError");

function attachUser(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
  } catch {
    // ignore invalid token
  }

  next();
}

function requireAuth(req, _res, next) {
  if (!req.user) {
    return next(httpError(401, "Authentication required"));
  }
  next();
}

function requireClient(req, _res, next) {
  if (!req.user?.clientId) {
    return next(httpError(403, "Client access only"));
  }
  next();
}

module.exports = {
  attachUser,
  requireAuth,
  requireClient,
};
