const ConsentPacket = require('../models/consent/ConsentPacket.model');
const StudioMembership = require('../modules/studios/StudioMembership.model');
const ArtistProfile = require('../modules/artists/ArtistProfile.model');
const { httpError } = require('../utils/httpError');

async function resolveArtistProfileIdForUser(userId) {
    const profile = await ArtistProfile.findOne({ userId}).select("_id").lean();
    return profile?._id?.toString() || null;
}

/**
 * Looks for consentPackeyId in:
 * - req.params.consentPacketId
 * - req.body.consentPacketId
 * - req.params.id
 */

function requireConsentAccess() {
    return async function (req, _res, next) {
        try {
            if (!req.user?._id) return next (httpError(401, "Authentication required", "AUTH_REQUIRED"));

            const packet = await ConsentPacket.findById(consentPacketId)
              .select("studioId artistProfileId appointmentId clientId status")
              .lean();

            if (!packet) return next(httpError(404, "Consent packet not found", "CONSENT_PACKET_NOT_FOUND"));

            const membership = await StudioMembership.findOne({
                studioId: packet.studioId,
                userId: req.user._id,
                isActive: true,
            }).lean();

            if (!membership) return next(httpError(403, "Not a member of the studio", "ACCESS_DENIED"));

            // Front desk never sees consent records

            if (membership.role === "FRONT_DESK") {
                return next(httpError(403, "Front desk cannot access consent records", "ACCESS_DENIED"));
            }

            //Managers/Owners can read any consent record for their studio, but can only update if they are the artist or client

            if (membership.role === "MANAGER" || membership.role === "OWNER") {
                req.consentPacket = packet;
                req.studio = { id: packet.studioId.toString() };
                req.membership = membership;
                return next();
            }

            //Artists can access ONLY their own services

            if (membership.role === "ARTIST") {
                const artistProfileId = await resolveArtistProfileIdForUser(req.user._id);
                if (!artistProfileId) return next(httpError(403, "Artist profile not found", "ACCESS_DENIED"));

                if (packet.artistProfileId.toString() !== artistProfileId) {
                    return next(httpError(403, "Artists can only access their own consent records", "ACCESS_DENIED"));  
                }

                req.consentPacket = packet;
                req.studio = { id: packet.studioId.toString() };
                req.membership = membership;
                return next();
            }

            return next(httpError(403, "Role not authorized to acceess consent records", "ACCESS_DENIED"));
        } catch (err) {
            next(err);
        }
    };
}

module.exports = { requireConsentAccess };