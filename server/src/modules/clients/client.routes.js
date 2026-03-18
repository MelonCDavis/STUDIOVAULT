const express = require("express");
const router = express.Router();
const Client = require("./Client.model");

const Appointment = require("../scheduling/Appointment.model");
const { requireAuth, requireClient } = require("../auth/auth.middleware");

router.get("/ping", (req, res) => {
  res.json({ clientRouteWorking: true });
});

router.get(
  "/me",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const client = await Client.findById(req.user.clientId).lean();

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const isOnboarded =
        !!client.legalName &&
        !!client.preferredName &&
        !!client.phoneE164 &&
        !!client.dateOfBirth &&
        client.isAdult === true;

      res.json({
        _id: client._id,
        legalName: client.legalName || "",
        preferredName: client.preferredName || "",
        pronouns: client.pronouns || "",
        phoneE164: client.phoneE164 || "",
        dateOfBirth: client.dateOfBirth || null,
        isAdult: client.isAdult === true,
        hasCompletedOnboarding: isOnboarded,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/me",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const {
        legalName,
        preferredName,
        pronouns,
        phoneE164,
        dateOfBirth,
        isAdult,
      } = req.body;

      const updatedClient = await Client.findByIdAndUpdate(
        req.user.clientId,
        {
          legalName,
          preferredName,
          pronouns,
          phoneE164,
          dateOfBirth,
          isAdult,
        },
        { new: true }
      ).lean();

      if (!updatedClient) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json(updatedClient);
    } catch (err) {
      next(err);
    }
  }
);

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
