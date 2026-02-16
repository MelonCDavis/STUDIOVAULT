const express = require("express");
const mongoose = require("mongoose");
const Appointment = require("./Appointment.model");

require("../clients/Client.model");
require("./Service.model");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const router = express.Router();

/*
  Helper: conflict detection
  Overlap rule:
  existing.startsAt < newEnd && existing.endsAt > newStart
*/
async function hasConflict({
  studioId,
  artistProfileId,
  startsAt,
  endsAt,
  excludeId = null,
}) {
  const query = {
    studioId,
    artistProfileId,
    status: { $ne: "CANCELLED" },
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const conflict = await Appointment.findOne(query).lean();
  return !!conflict;
}

/*
  GET appointments by date range
  /api/staff/appointments?studioId=...&artistProfileId=...&from=...&to=...
*/
router.get("/", async (req, res, next) => {
  try {
    const { studioId, artistProfileId, from, to } = req.query;

    if (!studioId || !artistProfileId || !from || !to) {
      return res.status(400).json({ message: "Missing required query params" });
    }

    if (
      !isValidObjectId(studioId) ||
      !isValidObjectId(artistProfileId)
    ) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    const appointments = await Appointment.find({
      studioId,
      artistProfileId,
      startsAt: { $lt: new Date(to) },
      endsAt: { $gt: new Date(from) },
    })
      .populate("clientId")
      .populate("serviceId")
      .sort({ startsAt: 1 })
      .lean();

      res.set("Cache-Control", "no-store");

    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

/*
  CREATE appointment
*/
router.post("/", async (req, res, next) => {
  try {
    const {
      studioId,
      artistProfileId,
      serviceId,
      isAdult,
      dateOfBirth,
      clientId,
      clientName,
      phone,
      email,
      startsAt,
      endsAt,
      status = "BOOKED",
      notesInternal,
      createdBy = "FSTAFF",
    } = req.body;

    if (isAdult === undefined) {
      return res.status(400).json({ message: "Age confirmation required" });
    }

    if (!studioId || !artistProfileId || !serviceId || !startsAt || !endsAt) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (
      !isValidObjectId(studioId) ||
      !isValidObjectId(artistProfileId) ||
      !isValidObjectId(serviceId)
    ) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    let resolvedClientId = clientId;

    if (resolvedClientId) {
      if (!isValidObjectId(resolvedClientId)) {
        return res.status(400).json({ message: "Invalid clientId" });
      }
    } else {
      if (!clientName) {
        return res.status(400).json({ message: "Client required" });
      }

      const Client = require("../clients/Client.model");

      const newClient = await Client.create({
        legalName: clientName,
        phoneE164: phone || "",
        email: email || "",
        isAdult,
        dateOfBirth: isAdult ? undefined : dateOfBirth,
        status: "active",
      });

      resolvedClientId = newClient._id;
    }

    if (new Date(startsAt) >= new Date(endsAt)) {
      return res.status(400).json({ message: "Invalid time range" });
    }

    const conflict = await hasConflict({
      studioId,
      artistProfileId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    });

    if (conflict) {
      return res.status(409).json({ message: "Time conflict detected" });
    }

    const appointment = await Appointment.create({
      studioId,
      artistProfileId,
      serviceId,
      clientId: resolvedClientId,
      startsAt,
      endsAt,
      status,
      notesInternal,
      createdBy,
    });

    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});


/*
  UPDATE appointment
*/
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Appointment.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const {
      startsAt,
      endsAt,
      status,
      notesInternal,
    } = req.body;

    if (startsAt && endsAt) {
      const conflict = await hasConflict({
        studioId: existing.studioId,
        artistProfileId: existing.artistProfileId,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        excludeId: id,
      });

      if (conflict) {
        return res.status(409).json({ message: "Time conflict detected" });
      }

      existing.startsAt = startsAt;
      existing.endsAt = endsAt;
    }

    if (status) existing.status = status;
    if (notesInternal !== undefined) existing.notesInternal = notesInternal;

    await existing.save();

    res.json(existing);
  } catch (err) {
    next(err);
  }
});

/*
  DELETE appointment
*/
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    await Appointment.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
