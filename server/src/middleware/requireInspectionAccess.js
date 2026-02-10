import { ROLES, roleAtLeast } from "../utils/roles.js";

const { httpError } = require('../utils/httpError');

function requireInspectionAccess() {
    return function (req, _res, next) {
        const role = req.membership?.role;
        if (!role) 
          return next(httpError(500, "Membership role not found"));
        
        if (role !== ROLES.OWNER && role !== ROLES.MANAGER) {
            return next(httpError(403, "Insufficient permissions to access inspection"));
        }

        next();
    };
}

module.EXPORTS = { requireInspectionAccess };