const express = require("express");
const router = express.Router();
const { requireAuth, requireStaff } = require("../auth/auth.middleware");
const Consultation = require("./Consultation.model");
const { computeConsultationSlots } = require("./availability/computeConsultationSlots");

// GET /api/staff/consultations
router.get(
  "/consultations",
  requireAuth,
  requireStaff,
  async (req, res, next) => {
    try {
      const { studioId, artistProfileId, status } = req.query;

      const query = {};

      if (studioId) query.studioId = studioId;
      if (artistProfileId) query.artistProfileId = artistProfileId;
      if (status) query.status = status;

      const consultations = await Consultation.find(query)
        .sort({ createdAt: -1 })
        .populate("clientId", "legalName email phoneE164");

      res.json(consultations);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/staff/consultations/availability
router.get(
  "/consultations/availability",
  requireAuth,
  requireStaff,
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
        slots: slots.map((d) => d.toISOString()),
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/staff/consultations/:id/approve
router.patch(
  "/consultations/:id/approve",
  requireAuth,
  requireStaff,
  async (req, res, next) => {
    try {
      const consultation = await Consultation.findById(req.params.id);

      if (!consultation) {
        return res.status(404).json({ error: "Consultation not found" });
      }

      if (consultation.status !== "REQUESTED") {
        return res.status(400).json({
          error: "Consultation not in REQUESTED state",
        });
      }

      consultation.status = "ACCEPTED";

      if (req.body?.message) {
        consultation.messages.push({
          sender: "ARTIST",
          body: req.body.message,
          visibleToClient: true,
        });
      }

      await consultation.save();

      res.json({ success: true, consultation });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/staff/consultations/:id/decline
router.patch(
  "/consultations/:id/decline",
  requireAuth,
  requireStaff,
  async (req, res, next) => {
    try {
      const consultation = await Consultation.findById(req.params.id);

      if (!consultation) {
        return res.status(404).json({ error: "Consultation not found" });
      }

      if (consultation.status !== "REQUESTED") {
        return res.status(400).json({
          error: "Consultation not in REQUESTED state",
        });
      }

      consultation.status = "DECLINED";

      if (req.body?.message) {
        consultation.messages.push({
          sender: "ARTIST",
          body: req.body.message,
          visibleToClient: true,
        });
      }

      await consultation.save();

      res.json({ success: true, consultation });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;