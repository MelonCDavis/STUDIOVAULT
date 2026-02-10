import { ROLES, roleAtLeast } from "../utils/roles.js";

const Appointment = require('../modules/scheduling/appointment.model');
const StudioMembership = require('../modules/studios/StudioMembership.model');
const ArtistProfile = require('../modules/artists/ArtistProfile.model');
const { httpError } = require('../utils/httpError');

async function resolveArtistProfileId(userId) {
    const profile = await ArtistProfile.findOne({ userId })
        .select('_id')
        .lean();
    return profile?._id?.toString() || null;
}
function requireAppointmentAccess() {
  return async function (req, _res, next) {
    try {
      const appointmentId =
        req.params.appointmentId ||
        req.params.id ||
        req.body.appointmentId;

      if (!appointmentId)
        return next(httpError(400, "Missing appointmentId"));

      const appt = await Appointment.findById(appointmentId).lean();
      if (!appt)
        return next(httpError(404, "Appointment not found"));

      const membership = await StudioMembership.findOne({
        studioId: appt.studioId,
        userId: req.user._id,
        isActive: true,
      }).lean();

      if (!membership)
        return next(httpError(403, "Not a studio member"));

      if (
        membership.role === ROLES.OWNER ||
        membership.role === ROLES.MANAGER ||
        membership.role === ROLES.FRONT_DESK
      ) {
        req.appointment = appt;
        req.membership = membership;
        return next();
      }

      if (membership.role === ROLES.ARTIST) {
        const artistProfileId = await resolveArtistProfileId(req.user._id);
        if (appt.artistProfileId.toString() !== artistProfileId) {
          return next(
            httpError(
              403,
              "Artists may only access their own appointments"
            )
          );
        }
        req.appointment = appt;
        req.membership = membership;
        return next();
      }

      return next(httpError(403, "Access denied"));
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireAppointmentAccess };