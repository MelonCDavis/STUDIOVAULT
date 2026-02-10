const StudioMembership = require("../modules/studios/StudioMembership.model");
const { httpError } = require("../utils/httpError");

function requireStudioRole(allowedRoles = []) {
    return async function (req, _res, next) {
        try {
            const studioId =
              req.params.studioId || 
              req.body.studioId || 
              req.query.studioId;

            if (!studioId) return next(httpError(400, "Missing studioId", "STUDIO_ID_REQUIRED"));
            if (!req.user?._id) return next(httpError(401, "Authentication required", "AUTH_REQUIRED"));

            const membership = await StudioMembership.findOne({
                studioId,
                userId: req.user._id,
                isActive: true,
            }).lean();

            if (!membership) return next(httpError(403, "not a member of this studio", "NOT_STUDIO_MEMBER"));
            if (allowedRoles.length && !allowedRoles.includes(membership.role)) {
                return next(httpError(403, "Insufficient permissions", "ROLE_NOT_ALLOWED"));
            }

            //attach for downstream use
            req.studio = { id: studioId };
            req.membership = membership;

            next();
        } catch (err) {
            next(err);
        }
    };
}
    
module.exports = { requireStudioRole };