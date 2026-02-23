const express = require("express");
const router = express.Router();

const Appointment = require("../scheduling/Appointment.model");
const { requireAuth, requireClient } = require("../auth/auth.middleware");

router.get("/ping", (req, res) => {
  res.json({ clientRouteWorking: true });
});

router.get("/appointments", requireAuth, requireClient, async (req, res, next) => {
  try {
    const appointments = await Appointment.find({
      clientId: req.user.clientId,
    })
      .sort({ startsAt: 1 })
      .lean();

    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
