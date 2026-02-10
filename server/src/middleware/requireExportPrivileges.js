const { httepError } = require('../utils/httpError');

function requireExportPrivileges() {
    return function (req, res, next) {
        const role = req.membership?.role;
        if (!role) return next(httepError(401, "Unauthorized", "MEMBERSHIP_REQUIRED"));

        if (role !== "OWNER" && role !== "MANAGER") {
            return next(httepError(403, "Unauthorized", "INSUFFICIENT_PRIVILEGES"));
        }
        const reason = req.query.reason;
        const allowedReason = ["HEALTH_DEPARMENT", "RECALL", "COURT_ORDER"];
        if (!reason || !allowedReason.includes(reason)) {
            return next(httepError(400, "Bad Export Request", "VALID_REASON_REQUIRED"));
        }
        next();
    };
}

module.exports = { requireExportPrivileges };