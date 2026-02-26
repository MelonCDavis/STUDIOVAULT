const express = require("express");
const router = express.Router();
const { requireAuth, requireStaff } = require("../auth/auth.middleware");

const Consultation = require("./Consultation.model");

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
        return res.status(400).json({ error: "Consultation not in REQUESTED state" });
      }
c
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
        return res.status(400).json({ error: "Consultation not in REQUESTED state" });
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