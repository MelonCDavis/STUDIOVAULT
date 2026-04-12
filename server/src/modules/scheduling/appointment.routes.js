const express = require("express");
const mongoose = require("mongoose");
const Appointment = require("./Appointment.model");
const ClientStudioLink = require("../clients/ClientStudioLink.model");
const { requireAuth, requireStaff } = require("../auth/auth.middleware");
require("../clients/Client.model");
require("./Service.model");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const ALLOWED_STATUSES = new Set([
  "HELD",
  "BOOKED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

function parseDateOrNull(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeStatus(v, fallback = "BOOKED") {
  if (!v) return fallback;
  const up = String(v).toUpperCase().trim();
  return ALLOWED_STATUSES.has(up) ? up : null;
}
 
function validateDepositForBooking({ status, deposit }) {
  if (status !== "BOOKED") return;

  const required = deposit?.requiredAmountCents || 0;
  const paid = deposit?.paidAmountCents || 0;

  if (required > 0 && paid < required) {
    const e = new Error("Deposit required before booking confirmation");
    e.status = 400;
    throw e;
  }
}

function validateHoldExpiration({ status, holdDurationHours }) {
  if (status !== "HELD") return null;

  const allowed = [24, 48, 72];
  if (!allowed.includes(holdDurationHours)) {
    const e = new Error("Invalid hold duration");
    e.status = 400;
    throw e;
  }

  const expires = new Date();
  expires.setHours(expires.getHours() + holdDurationHours);
  return expires;
}

const ALLOWED_TRANSITIONS = {
  HELD: ["BOOKED", "CANCELLED"],
  BOOKED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

function validateStatusTransition(from, to) {
  if (from === to) return;

  const allowed = ALLOWED_TRANSITIONS[from] || [];

  if (!allowed.includes(to)) {
    const e = new Error(`Invalid status transition from ${from} to ${to}`);
    e.status = 400;
    throw e;
  }
}

async function expireHeldAppointments({ studioId, artistProfileId }) {
  const now = new Date();

  await Appointment.updateMany(
    {
      studioId,
      artistProfileId,
      status: "HELD",
      holdExpiresAt: { $lte: now },
    },
    {
      $set: { status: "CANCELLED", holdExpiresAt: null },
    }
  );
}

async function upsertClientStudioLink({
  clientId,
  studioId,
  bookedAt,
  session,
}) {
  if (!clientId || !studioId) return;

  await ClientStudioLink.findOneAndUpdate(
    {
      clientId,
      studioId,
    },
    {
      $set: {
        status: "active",
        lastBookedAt: bookedAt,
      },
      $setOnInsert: {
        clientId,
        studioId,
      },
    },
    {
      new: true,
      upsert: true,
      session,
    }
  );
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
  session = null,
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

 let q = Appointment.findOne(query);
  if (session) q = q.session(session);

  const conflict = await q.lean();

  return !!conflict;
}

async function runInTransaction(workFn) {
  const session = await mongoose.startSession();

  try {
    let result;

    // Retry once for transient transaction errors (write conflicts, etc.)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await session.withTransaction(async () => {
          result = await workFn(session);
        });
        return result;
      } catch (err) {
        const isTransient =
          err?.errorLabels?.includes("TransientTransactionError") ||
          err?.errorLabels?.includes("UnknownTransactionCommitResult");

        if (attempt === 0 && isTransient) continue;
        throw err;
      }
    }

    return result;
  } finally {
    session.endSession();
  }
}

/*
  GET appointments by date range
  /api/staff/appointments?studioId=...&artistProfileId=...&from=...&to=...
*/
router.get("/", requireAuth, requireStaff, async (req, res, next) => {
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

    await expireHeldAppointments({
      studioId,
      artistProfileId,
    });

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
    if (err?.status === 409 && err?.duplicate) {
      return res.status(409).json({
        error: err.message || "Duplicate client found",
        duplicate: true,
        existingClient: err.existingClient,
      });
    }

    next(err);
  }
});

/*
  CREATE appointment
*/
router.post("/", requireAuth, requireStaff, async (req, res, next) => {
  try {
    const {
      studioId,
      artistProfileId,
      serviceId,
      isAdult,
      dateOfBirth,
      clientId,
      legalName,
      preferredName,
      pronouns,
      phone,
      email,
      startsAt,
      endsAt,
      status = "BOOKED",
      notesInternal,
      deposit,
      holdDurationHours,
      forceCreate = false,
    } = req.body;

    if (typeof isAdult !== "boolean") {
      return res.status(400).json({ message: "Age confirmation required" });
    }

    if (!studioId || !artistProfileId || !serviceId || !startsAt || !endsAt) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const startDate = parseDateOrNull(startsAt);
    const endDate = parseDateOrNull(endsAt);
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Invalid startsAt/endsAt" });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ message: "Invalid time range" });
    }

    const statusNormalized = normalizeStatus(status, "BOOKED");
    if (!statusNormalized) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (isAdult === false) {
      const dob = parseDateOrNull(dateOfBirth);
      if (!dob) {
        return res.status(400).json({ message: "dateOfBirth required for minors" });
      }
    }

    if (
      !isValidObjectId(studioId) ||
      !isValidObjectId(artistProfileId) ||
      !isValidObjectId(serviceId)
    ) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    const created = await runInTransaction(async (session) => {
      let resolvedClientId = clientId;

      if (resolvedClientId) {
        if (!isValidObjectId(resolvedClientId)) {
          // throw inside txn so it aborts cleanly
          const e = new Error("Invalid clientId");
          e.status = 400;
          throw e;
        }
      } else {
        const normalizedLegalName = (legalName || "").trim();
        const normalizedPreferredName = (preferredName || "").trim();
        const normalizedPronouns = (pronouns || "").trim();

        if (!normalizedLegalName && !normalizedPreferredName) {
          const e = new Error("Legal name or preferred name required");
          e.status = 400;
          throw e;
        }

        // Production-safe: require phone/email for new client creation
        if (!phone || !email) {
          const e = new Error("Phone and email required for new client");
          e.status = 400;
          throw e;
        }

        const Client = require("../clients/Client.model");

        const normalizedPhone = phone?.trim();
        const normalizedEmail = email?.trim().toLowerCase();

        // try phone match first
        let existingClient = null;

        if (normalizedPhone) {
          existingClient = await Client.findOne({
            phoneE164: normalizedPhone,
          }).session(session);
        }

        // fallback email match
        if (!existingClient && normalizedEmail) {
          existingClient = await Client.findOne({
            email: normalizedEmail,
          }).session(session);
        }

        if (existingClient) {
          return res.status(409).json({
            error: "Duplicate client found",
            duplicate: true,
            existingClient: {
              _id: existingClient._id,
              legalName: existingClient.legalName || "",
              preferredName: existingClient.preferredName || "",
              pronouns: existingClient.pronouns || "",
              email: existingClient.email || "",
              phoneE164: existingClient.phoneE164 || "",
            },
          });
        } else {
          const newClient = await Client.create(
            [
              {
                legalName: normalizedLegalName || normalizedPreferredName,
                preferredName: normalizedPreferredName || undefined,
                pronouns: normalizedPronouns || undefined,
                phoneE164: normalizedPhone,
                email: normalizedEmail,
                isAdult,
                dateOfBirth: isAdult ? undefined : dateOfBirth,
                status: "active",
              }
            ],
            { session }
          );

          resolvedClientId = newClient[0]._id;
        }
      }

      // Use the already-validated/parsed dates you created earlier in POST:
      // startDate, endDate, and statusNormalized
      const conflict = await hasConflict({
        studioId,
        artistProfileId,
        startsAt: startDate,
        endsAt: endDate,
        session,
      });

      if (conflict) {
        const e = new Error("Time conflict detected");
        e.status = 409;
        throw e;
      }

      validateDepositForBooking({
        status: statusNormalized,
        deposit,
      });

      let holdExpiresAt = null;

      if (statusNormalized === "HELD") {
        holdExpiresAt = validateHoldExpiration({
          status: statusNormalized,
          holdDurationHours,
        });
      }

      const appointmentDocs = await Appointment.create(
        [
          {
            studioId,
            artistProfileId,
            serviceId,
            clientId: resolvedClientId,
            startsAt: startDate,
            endsAt: endDate,
            status: statusNormalized,
            notesInternal,
            deposit,
            holdExpiresAt,
            createdBy: "FSTAFF",
          },
        ],
        { session }
      );

      const createdAppointment = appointmentDocs[0];

      await upsertClientStudioLink({
        clientId: resolvedClientId,
        studioId,
        bookedAt: createdAppointment.startsAt,
        session,
      });

      return createdAppointment;
    });

    return res.status(201).json(created);

  } catch (err) {
    next(err);
  }
});


/*
  UPDATE appointment
*/
router.patch("/:id", requireAuth, requireStaff, async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await runInTransaction(async (session) => {
      const existing = await Appointment.findById(id).session(session);
      if (!existing) {
        const e = new Error("Appointment not found");
        e.status = 404;
        throw e;
      }

      const {
        startsAt,
        endsAt,
        status,
        notesInternal,
        deposit,
        holdDurationHours,
        clientId,
      } = req.body;

      const statusNormalized = status
        ? normalizeStatus(status, existing.status)
        : null;

      if (status && !statusNormalized) {
        const e = new Error("Invalid status");
        e.status = 400;
        throw e;
      }

      let nextStart = existing.startsAt;
      let nextEnd = existing.endsAt;

      if (startsAt || endsAt) {
        nextStart = startsAt ? parseDateOrNull(startsAt) : existing.startsAt;
        nextEnd = endsAt ? parseDateOrNull(endsAt) : existing.endsAt;

        if (!nextStart || !nextEnd) {
          const e = new Error("Invalid startsAt/endsAt");
          e.status = 400;
          throw e;
        }

        if (nextStart >= nextEnd) {
          const e = new Error("Invalid time range");
          e.status = 400;
          throw e;
        }

        const conflict = await hasConflict({
          studioId: existing.studioId,
          artistProfileId: existing.artistProfileId,
          startsAt: nextStart,
          endsAt: nextEnd,
          excludeId: id,
          session,
        });

        if (conflict) {
          const e = new Error("Time conflict detected");
          e.status = 409;
          throw e;
        }

        existing.startsAt = nextStart;
        existing.endsAt = nextEnd;
      }
      if (clientId !== undefined) {
        if (!isValidObjectId(clientId)) {
          const e = new Error("Invalid clientId");
          e.status = 400;
          throw e;
        }

        existing.clientId = clientId;
      }
      if (deposit !== undefined) {
        existing.deposit = deposit;
      }

      if (statusNormalized) {
        validateStatusTransition(existing.status, statusNormalized);
        if ((statusNormalized === "CANCELLED" || statusNormalized === "NO_SHOW")) {
          const note = typeof notesInternal === "string" ? notesInternal.trim() : "";
          if (!note) {
            const e = new Error("notesInternal required for CANCELLED / NO_SHOW");
            e.status = 400;
            throw e;
          }
        }
        // If transitioning INTO HELD, compute expiration
        if (statusNormalized === "HELD") {
          existing.holdExpiresAt = validateHoldExpiration({
            status: statusNormalized,
            holdDurationHours,
          });
        }

        // If transitioning OUT of HELD, clear expiration
        if (existing.status === "HELD" && statusNormalized !== "HELD") {
          existing.holdExpiresAt = null;
        }

        validateDepositForBooking({
          status: statusNormalized,
          deposit: existing.deposit,
        });

        existing.status = statusNormalized;
      }

      if (notesInternal !== undefined) {
        existing.notesInternal = notesInternal;
      }

      await existing.save({ session });

      await upsertClientStudioLink({
        clientId: existing.clientId,
        studioId: existing.studioId,
        bookedAt: existing.startsAt,
        session,
      });

      return existing;
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

/*
  DELETE appointment
*/
router.delete("/:id", requireAuth, requireStaff, async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await Appointment.findByIdAndUpdate(
      id,
      { status: "CANCELLED" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({ success: true, appointment: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
