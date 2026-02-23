const express = require("express");
const router = express.Router();

const BookingRequest = require("./bookingRequest.model");
const { requireAuth } = require("../auth/auth.middleware");

// Client validates booking token
router.get("/:token", requireAuth, async (req, res, next) => {
  try {
    const { token } = req.params;

    const request = await BookingRequest.findOne({ token }).lean();

    if (!request) {
      return res.status(404).json({ error: "Invalid booking link" });
    }

    if (request.status !== "ACTIVE") {
      return res.status(400).json({ error: "Booking link is no longer active" });
    }

    if (request.expiresAt < new Date()) {
      return res.status(400).json({ error: "Booking link has expired" });
    }

    // Ensure token belongs to logged-in client
    if (request.clientId.toString() !== req.user.clientId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      studioId: request.studioId,
      artistProfileId: request.artistProfileId,
      durationMinutes: request.durationMinutes,
      expiresAt: request.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
