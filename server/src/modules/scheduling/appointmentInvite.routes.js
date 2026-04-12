const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");

const { requireAuth, requireStaff, requireClient } = require("../auth/auth.middleware");
const AppointmentInvite = require("./AppointmentInvite.model");
const Appointment = require("./Appointment.model");
const Consultation = require("./Consultation.model");

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

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