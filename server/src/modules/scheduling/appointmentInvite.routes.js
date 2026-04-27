const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");

const { requireAuth, requireStaff, requireClient } = require("../auth/auth.middleware");
const AppointmentInvite = require("./AppointmentInvite.model");
const Appointment = require("./Appointment.model");
const Consultation = require("./Consultation.model");
const Service = require("./Service.model");
const { computeHourlySlots } = require("./availability/computeHourlySlots");

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function groupMagneticSlots(slots, placementMode) {
  if (!Array.isArray(slots) || slots.length === 0) return [];

  const ordered = [...slots].sort((a, b) => a - b);
  const groups = [];
  let current = [ordered[0]];

  for (let i = 1; i < ordered.length; i += 1) {
    const prev = ordered[i - 1];
    const next = ordered[i];
    const diffMinutes = (next.getTime() - prev.getTime()) / 60000;

    if (diffMinutes === 15) {
      current.push(next);
    } else {
      groups.push(current);
      current = [next];
    }
  }

  groups.push(current);

  if (placementMode === "FLEXIBLE") {
    return ordered;
}

  if (placementMode === "CLOSE_MAGNETIC") {
    return groups.map((group) => group[group.length - 1]);
  }

  return groups.map((group) => group[0]);
}

async function getEligibleInviteSlots(invite) {
  const rawSlots = await computeHourlySlots({
    artistProfileId: invite.artistProfileId,
    studioId: invite.studioId,
    from: invite.validFrom,
    to: invite.validUntil,
    durationMinutes: invite.durationMinutes,
  });

  return groupMagneticSlots(rawSlots, invite.placementMode);
}

// CLIENT: get valid invite slots
router.get(
  "/appointment-invites/:token/slots",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const invite = await AppointmentInvite.findOne({
        token: req.params.token,
      }).lean();

      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      if (String(invite.clientId) !== String(req.user.clientId)) {
        return res.status(403).json({ error: "Invite does not belong to this client" });
      }

      if (invite.status !== "ACTIVE") {
        return res.status(400).json({ error: "Invite is not active" });
      }

      const now = new Date();
      if (new Date(invite.validUntil) <= now) {
        await AppointmentInvite.updateOne(
            { _id: invite._id },
            { $set: { status: "EXPIRED" } }
        );

        return res.status(400).json({ error: "Invite has expired" });
        }

      const slots = await getEligibleInviteSlots(invite);

      res.json({
        placementMode: invite.placementMode,
        durationMinutes: invite.durationMinutes,
        slots: slots.map((slot) => slot.toISOString()),
      });
    } catch (err) {
      next(err);
    }
  }
);

// STAFF: create invite
router.post(
  "/appointment-invites",
  requireAuth,
  requireStaff,
  async (req, res, next) => {
    try {
      const {
        studioId,
        artistProfileId,
        clientId,
        consultationId,
        durationMinutes = 60,
        placementMode = "OPEN_MAGNETIC",
        validFrom,
        validUntil,
        messageToClient = "",
      } = req.body;

      if (!studioId || !artistProfileId || !clientId || !validFrom || !validUntil) {
        return res.status(400).json({
          error: "studioId, artistProfileId, clientId, validFrom, and validUntil are required",
        });
      }

      if (
        !isValidObjectId(studioId) ||
        !isValidObjectId(artistProfileId) ||
        !isValidObjectId(clientId) ||
        (consultationId && !isValidObjectId(consultationId))
      ) {
        return res.status(400).json({ error: "Invalid IDs" });
      }

      const validFromDate = new Date(validFrom);
      const validUntilDate = new Date(validUntil);

      if (Number.isNaN(validFromDate.getTime()) || Number.isNaN(validUntilDate.getTime())) {
        return res.status(400).json({ error: "Invalid validFrom/validUntil" });
      }

      if (validFromDate >= validUntilDate) {
        return res.status(400).json({ error: "validFrom must be before validUntil" });
      }

      const invite = await AppointmentInvite.create({
        studioId,
        artistProfileId,
        clientId,
        consultationId: consultationId || null,
        token: makeToken(),
        durationMinutes,
        placementMode,
        validFrom: validFromDate,
        validUntil: validUntilDate,
        messageToClient,
        createdByUserId: req.user?._id || null,
      });

      if (consultationId) {
        const consultation = await Consultation.findById(consultationId);
        if (consultation) {
          consultation.messages.push({
            sender: "SYSTEM",
            type: "APPOINTMENT_LINK_SENT",
            body: messageToClient || "Appointment booking link sent.",
            visibleToClient: true,
            imageRefs: [],
          });
          await consultation.save();
        }
      }

      res.status(201).json({
        _id: invite._id,
        token: invite.token,
        status: invite.status,
        durationMinutes: invite.durationMinutes,
        placementMode: invite.placementMode,
        validFrom: invite.validFrom,
        validUntil: invite.validUntil,
        messageToClient: invite.messageToClient,
      });
    } catch (err) {
      next(err);
    }
  }
);

// CLIENT: read invite by token
router.get(
  "/appointment-invites/:token",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const invite = await AppointmentInvite.findOne({
        token: req.params.token,
      }).lean();

      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      if (String(invite.clientId) !== String(req.user.clientId)) {
        return res.status(403).json({ error: "Invite does not belong to this client" });
      }

      res.json(invite);
    } catch (err) {
      next(err);
    }
  }
);

// CLIENT: redeem invite into booked appointment
router.post(
  "/appointment-invites/:token/book",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const { startsAt, serviceId } = req.body;

      if (!startsAt || !serviceId) {
        return res.status(400).json({ error: "startsAt and serviceId are required" });
      }

      const invite = await AppointmentInvite.findOne({
        token: req.params.token,
      });

      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      if (String(invite.clientId) !== String(req.user.clientId)) {
        return res.status(403).json({ error: "Invite does not belong to this client" });
      }

      if (invite.status !== "ACTIVE") {
        return res.status(400).json({ error: "Invite is not active" });
      }

      const now = new Date();
      if (invite.validUntil <= now) {
        invite.status = "EXPIRED";
        await invite.save();
        return res.status(400).json({ error: "Invite has expired" });
      }

      const start = new Date(startsAt);
      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({ error: "Invalid startsAt" });
      }

      const service = await Service.findById(serviceId).lean();

    if (!service || service.isActive !== true) {
    return res.status(400).json({ error: "Invalid serviceId" });
    }

    if (String(service.studioId) !== String(invite.studioId)) {
    return res.status(400).json({ error: "Service does not belong to this studio" });
    }

    const eligibleSlots = await getEligibleInviteSlots(invite);
    const requestedIso = start.toISOString();

    const isEligible = eligibleSlots.some(
    (slot) => slot.toISOString() === requestedIso
    );

    if (!isEligible) {
    return res.status(400).json({
        error: "Selected time is not valid for this invite",
    });
    }

      const end = new Date(start.getTime() + invite.durationMinutes * 60000);

      const conflict = await Appointment.findOne({
        studioId: invite.studioId,
        artistProfileId: invite.artistProfileId,
        status: { $ne: "CANCELLED" },
        startsAt: { $lt: end },
        endsAt: { $gt: start },
      }).lean();

      if (conflict) {
        return res.status(409).json({ error: "Time conflict detected" });
      }

      const appointment = await Appointment.create({
        studioId: invite.studioId,
        artistProfileId: invite.artistProfileId,
        clientId: invite.clientId,
        serviceId,
        startsAt: start,
        endsAt: end,
        status: "BOOKED",
        createdBy: "CLIENT",
      });

      invite.status = "USED";
      invite.selectedAppointmentId = appointment._id;
      await invite.save();

      if (invite.consultationId) {
        const consultation = await Consultation.findById(invite.consultationId);
        if (consultation) {
          consultation.messages.push({
            sender: "SYSTEM",
            type: "APPOINTMENT_CONFIRMED",
            body: "Appointment selected and confirmed.",
            visibleToClient: true,
            imageRefs: [],
          });
          await consultation.save();
        }
      }

      res.status(201).json({
        success: true,
        appointmentId: appointment._id,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;