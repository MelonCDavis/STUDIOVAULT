const { httpError } = require('../utils/httpError');

function requireAuth(req, _res, next) {
    if (!req.user) return next(httpError(401, "Authentication required", "AUTH_REQUIRED"));
    if (req.user.status && req.user.status !== "active") {
        return next(httpError(403, "User is not active", "USER_INACTIVE"));
    }
    next();
}

module.exports = { requireAuth };