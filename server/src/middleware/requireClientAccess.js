import { ROLES, roleAtLeast } from "../utils/roles.js";

const Client = require('../modules/clients/Client.model');
const Appointment = require('../modules/scheduling/appointment.model');
const StudioMembership = require('../modules/studios/StudioMembership.model');
const ArtistProfile = require('../modules/artists/ArtistProfile.model');
const { httpError } = require('../utils/httpError');

async function resolveArtistProfileId(userId) {
  const profile = await ArtistProfile.findOne({ userId })
    .select("_id")
    .lean();
  return profile?._id?.toString() || null;
}

function requireClientAccess() {
    return async function (req, _res, next) {
    try {
      const clientId =
        req.params.clientId ||
        req.params.id ||
        req.body.clientId;

      if (!clientId)
        return next(httpError(400, "Missing clientId"));

      const client = await Client.findById(clientId).lean();
      if (!client)
        return next(httpError(404, "Client not found"));

      const studioId =
        req.params.studioId ||
        req.body.studioId ||
        req.query.studioId;

      if (!studioId)
        return next(httpError(400, "Missing studioId"));

      const membership = await StudioMembership.findOne({
        studioId,
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
        req.client = client;
        req.membership = membership;
        return next();
      }

      if (membership.role === ROLES.ARTIST) {
        const artistProfileId = await resolveArtistProfileId(req.user._id);

        const hasRelationship = await Appointment.exists({
          clientId,
          artistProfileId,
        });

        if (!hasRelationship) {
          return next(
            httpError(
              403,
              "Artists may only access their own clients"
            )
          );
        }

        req.client = client;
        req.membership = membership;
        return next();
      }

      return next(httpError(403, "Access denied"));
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireClientAccess };