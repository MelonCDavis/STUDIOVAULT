const express = require("express");
const router = express.Router();
const BookingRequest = require("./bookingRequest.model");
const { requireAuth } = require("../../middleware/requireAuth");
const { requireStudioRole } = require("../../middleware/requireStudioRole");
const crypto = require("crypto");

const { computeHourlySlots } = require("./availability/computeHourlySlots");
const AvailabilityRule = require("./AvailabilityRule.model");

// POST /api/staff/availability-rules
router.post(
  "/availability-rules",
  requireAuth,
  async (req, res, next) => {
    try {
      const {
        studioId,
        artistProfileId,
        DayOfWeek,
        startTime,
        endTime,
        timezone,
        buffers,
        concurrency,
        isActive,
      } = req.body;

      if (!studioId || !artistProfileId) {
        return res.status(400).json({ error: "studioId and artistProfileId are required" });
      }

      if (DayOfWeek === undefined || !Number.isInteger(DayOfWeek) || DayOfWeek < 0 || DayOfWeek > 6) {
        return res.status(400).json({ error: "DayOfWeek must be 0–6" });
      }

      if (!startTime || !endTime) {
        return res.status(400).json({ error: "startTime and endTime are required" });
      }

      if (!timezone) {
        return res.status(400).json({ error: "timezone is required" });
      }

      const rule = await AvailabilityRule.create({
        studioId,
        artistProfileId,
        type: "WEEKLY",
        DayOfWeek,
        startTime,
        endTime,
        timezone,
        buffers,
        concurrency,
        isActive,
      });

      res.status(201).json(rule);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/availability-rules",
  requireAuth,
  async (req, res, next) => {
    try {
      const { artistProfileId, studioId } = req.query;

      if (!artistProfileId || !studioId) {
        return res.status(400).json({ error: "artistProfileId and studioId are required" });
      }

      const rules = await AvailabilityRule.find({
        artistProfileId,
        studioId,
        type: "WEEKLY",
      }).sort({ DayOfWeek: 1, startTime: 1 });

      res.json({ count: rules.length, rules });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/availability",
  requireAuth,
  async (req, res, next) => {
    try {
      const { artistProfileId, studioId, from, to, durationMinutes } = req.query;

      const slots = await computeHourlySlots({
        artistProfileId,
        studioId,
        from,
        to,
        durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
      });

      res.json({ slots });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/staff/booking-requests
router.post(
  "/booking-requests",
  requireAuth,
  requireStudioRole(["OWNER", "MANAGER", "ARTIST"]),
  async (req, res, next) => {
    try {
      const { studioId, artistProfileId, clientId, durationMinutes } = req.body;

      const token = crypto.randomBytes(24).toString("hex");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const bookingRequest = await BookingRequest.create({
        token,
        studioId,
        artistProfileId,
        clientId,
        durationMinutes,
        expiresAt,
        status: "ACTIVE"
      });

      res.status(201).json(bookingRequest);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
