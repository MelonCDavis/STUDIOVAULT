const { verifyToken } = require("./auth.utils");
const { httpError } = require("../../utils/httpError");
const StudioMembership = require("../studios/StudioMembership.model");
function attachUser(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
  } catch {
    console.error("attachUser token verify failed:", err.message);
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

async function requireStaff(req, _res, next) {
  if (!req.user?._id) {
    return next(httpError(403, "Staff access only"));
  }

  const membership = await StudioMembership.findOne({
    userId: req.user._id,
    isActive: true,
  });

  if (!membership) {
    return next(httpError(403, "Staff access only"));
  }

  req.membership = membership; // attach for downstream use
  next();
}

module.exports = {
  attachUser,
  requireAuth,
  requireClient,
  requireStaff,
};
