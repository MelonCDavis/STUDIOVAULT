const express = require("express");
const router = express.Router();
const { requireAuth, requireClient } = require("../auth/auth.middleware");
const { computeConsultationSlots } = require("./availability/computeConsultationSlots");
const ArtistProfile = require("../artists/ArtistProfile.model");
const Consultation = require("./Consultation.model");

console.log("CONSULTATION ROUTES LOADED");

// GET /api/client/consultations/availability
router.get(
  "/consultations/availability",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const { artistProfileId, studioId, from, to } = req.query;

      if (!artistProfileId || !studioId || !from || !to) {
        return res.status(400).json({ error: "Missing required query params" });
      }

      const slots = await computeConsultationSlots({
        artistProfileId,
        studioId,
        from,
        to,
      });

      res.json({
        slots: slots.map(d => d.toISOString()),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/client/consultations/request
router.post(
  "/consultations/request",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const {
        artistProfileId,
        studioId,
        startsAt,
        description,
        preferredDate,
        travelInfo,
        budget,
      } = req.body;

      if (!artistProfileId || !studioId || !startsAt) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const artist = await ArtistProfile.findById(artistProfileId);

      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }

      const settings = artist.consultationSettings;

      if (!settings || !settings.isEnabled) {
        return res.status(400).json({ error: "Consultations not enabled" });
      }

      // Recompute availability for that day
      const dayStart = new Date(startsAt);
      dayStart.setUTCHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      const availableSlots = await computeConsultationSlots({
        artistProfileId,
        studioId,
        from: dayStart,
        to: dayEnd,
      });

      // Normalize to ISO for comparison
      const requestedISO = new Date(startsAt).toISOString();

      const isValidSlot = availableSlots.some(
        d => d.toISOString() === requestedISO
      );

      console.log("AVAILABLE SLOTS", availableSlots.map(d => d.toISOString()));
      console.log("REQUESTED", requestedISO);
      console.log("IS VALID", isValidSlot);
      

      if (!isValidSlot) {
        return res.status(400).json({
          error: "Selected time is not available.",
        });
      }

      const consultation = await Consultation.create({
        studioId,
        artistProfileId,
        clientId: req.user.clientId,
        startsAt: new Date(startsAt), // informational only
        intake: {
          description: description || "",
          preferredDate: preferredDate || "",
          travelInfo: travelInfo || "",
          budget: budget || "",
        },

        messages: [
          {
            sender: "CLIENT",
            body: description || "Consultation request submitted.",
            visibleToClient: true,
          },
        ],
      });

      res.status(201).json(consultation);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;