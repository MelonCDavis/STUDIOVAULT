const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Client = require("./Client.model");
const ClientStudioLink = require("./ClientStudioLink.model");
const ClientIntakeSession = require("./ClientIntakeSession.model");

const Appointment = require("../scheduling/Appointment.model");
const Consultation = require("../scheduling/Consultation.model");
const { requireAuth, requireClient } = require("../auth/auth.middleware");
const { requireStudioRole } = require("../../middleware/requireStudioRole");

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getStudioIdFromRequest(req) {
  return (
    req.studio?.id ||
    req.membership?.studioId ||
    req.body?.studioId ||
    req.query?.studioId ||
    null
  );
}

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function addMonths(date, months) {
  const value = new Date(date);
  value.setMonth(value.getMonth() + months);
  return value;
}

function buildPrefilledSessionFromSources({ client, lastCompleted, appointment }) {
  return {
    clientId: client._id,
    studioId: appointment.studioId,
    appointmentId: appointment._id,
    artistProfileId: appointment.artistProfileId || null,
    sourceIntakeSessionId: lastCompleted?._id || null,
    status: "IN_PROGRESS",
    serviceDate: appointment.startsAt,
    profileSnapshot: {
      legalName:
        lastCompleted?.profileSnapshot?.legalName || client.legalName || "",
      preferredName:
        lastCompleted?.profileSnapshot?.preferredName || client.preferredName || "",
      pronouns:
        lastCompleted?.profileSnapshot?.pronouns || client.pronouns || "",
      dateOfBirth:
        lastCompleted?.profileSnapshot?.dateOfBirth || client.dateOfBirth || null,
      isAdult:
        typeof lastCompleted?.profileSnapshot?.isAdult === "boolean"
          ? lastCompleted.profileSnapshot.isAdult
          : client.isAdult === true,
      phoneE164:
        lastCompleted?.profileSnapshot?.phoneE164 || client.phoneE164 || "",
      email:
        lastCompleted?.profileSnapshot?.email || client.email || "",
      address:
        lastCompleted?.profileSnapshot?.address || client.address || "",
      emergencyContact: {
        name:
          lastCompleted?.profileSnapshot?.emergencyContact?.name ||
          client.emergencyContact?.name ||
          "",
        phoneE164:
          lastCompleted?.profileSnapshot?.emergencyContact?.phoneE164 ||
          client.emergencyContact?.phoneE164 ||
          "",
        relationship:
          lastCompleted?.profileSnapshot?.emergencyContact?.relationship ||
          client.emergencyContact?.relationship ||
          "",
      },
      photoIdImageUrl: "",
      photoIdType: "",
      photoIdVerifiedAt: null,
      photoIdVerifiedBy: null,
    },
    healthSnapshot: {
      allergies: Array.isArray(lastCompleted?.healthSnapshot?.allergies)
        ? lastCompleted.healthSnapshot.allergies
        : [],
      medications: Array.isArray(lastCompleted?.healthSnapshot?.medications)
        ? lastCompleted.healthSnapshot.medications
        : [],
      medicalConditions: Array.isArray(lastCompleted?.healthSnapshot?.medicalConditions)
        ? lastCompleted.healthSnapshot.medicalConditions
        : [],
      eatenRecently:
        lastCompleted?.healthSnapshot?.eatenRecently || "DECLINED",
      underInfluence:
        lastCompleted?.healthSnapshot?.underInfluence || "DECLINED",
      notes: lastCompleted?.healthSnapshot?.notes || "",
    },
    consentSnapshot: {
      consentVersion:
        lastCompleted?.consentSnapshot?.consentVersion || "v1",
      agreedPermanency: false,
      agreedSubjectiveArt: false,
      agreedNoMedicalAdvice: false,
      agreedSoberStatement: false,
      agreedTruthfulInformation: false,
    },
    clientSignature: {
      signedName: "",
      signedAt: null,
      signatureImageUrl: "",
    },
    artistReview: {
      reviewedBy: null,
      reviewedAt: null,
      artistSignedName: "",
      artistSignedAt: null,
      flaggedSummary: "",
      notes: "",
    },
    procedureCompliance: {
      pigmentLots: [],
      needleLots: [],
      jewelryLots: [],
      jurisdictionNotes: "",
    },
    isCurrent: true,
    retainUntil: addMonths(appointment.startsAt, 13),
  };
}

router.get("/ping", (req, res) => {
  res.json({ clientRouteWorking: true });
});

router.get(
  "/staff-directory",
  requireAuth,
  requireStudioRole(["FRONT_DESK", "ARTIST", "MANAGER", "OWNER"]),
  async (req, res, next) => {
    try {
      const studioId = req.studio?.id || req.membership?.studioId || null;

      if (!studioId) {
        return res.status(400).json({
          error: "Studio context missing",
          code: "STUDIO_CONTEXT_MISSING",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(studioId)) {
        return res.status(400).json({
          error: "Invalid studioId",
          code: "INVALID_STUDIO_ID",
        });
      }

      const studioObjectId = new mongoose.Types.ObjectId(studioId);

      const rawSearch = String(req.query.search || "").trim();
      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 100);
      const skip = (page - 1) * limit;

      // ---------- SEARCH CLIENTS FIRST ----------
      let clientFilter = { status: "active" };

      if (rawSearch) {
        const escaped = escapeRegex(rawSearch);
        const digitSearch = rawSearch.replace(/\D/g, "");

        clientFilter.$or = [
          { legalName: { $regex: escaped, $options: "i" } },
          { preferredName: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } },
          {
            phoneE164: {
              $regex: digitSearch || escaped,
              $options: "i",
            },
          },
        ];
      }

      const matchingClients = await Client.find(clientFilter)
        .select("_id legalName preferredName email phoneE164 status createdAt updatedAt")
        .lean();

      const matchingIds = matchingClients.map((c) => c._id);

      if (!matchingIds.length) {
        return res.json({
          items: [],
          page,
          limit,
          total: 0,
          pages: 1,
          hasMore: false,
        });
      }

      // ---------- FILTER STUDIO LINKS ----------
      const linkQuery = {
        studioId: studioObjectId,
        status: "active",
        clientId: { $in: matchingIds },
      };

      const total = await ClientStudioLink.countDocuments(linkQuery);

      const links = await ClientStudioLink.find(linkQuery)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const clientIds = links.map((link) => link.clientId);

      const clientMap = new Map(
        matchingClients.map((c) => [String(c._id), c])
      );

      const items = links
        .map((link) => {
          const client = clientMap.get(String(link.clientId));

          if (!client) return null;

          return {
            _id: client._id,
            legalName: client.legalName || "",
            preferredName: client.preferredName || "",
            email: client.email || "",
            phoneE164: client.phoneE164 || "",
            clientStatus: client.status || "active",
            linkStatus: link?.status || "active",
            createdAt: client.createdAt || null,
            updatedAt: client.updatedAt || null,
            lastBookedAt: link?.lastBookedAt || null,
            notesOperational: link?.notesOperational || "",
          };
        })
        .filter(Boolean);

      const pages = total > 0 ? Math.ceil(total / limit) : 1;

      res.json({
        items,
        page,
        limit,
        total,
        pages,
        hasMore: page < pages,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/staff-directory/:clientId",
  requireAuth,
  requireStudioRole(["FRONT_DESK", "ARTIST", "MANAGER", "OWNER"]),
  async (req, res, next) => {
    try {
      const studioId = getStudioIdFromRequest(req);
      const { clientId } = req.params;

      if (!studioId) {
        return res.status(400).json({
          error: "Studio context missing",
          code: "STUDIO_CONTEXT_MISSING",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(studioId) ||
        !mongoose.Types.ObjectId.isValid(clientId)
      ) {
        return res.status(400).json({
          error: "Invalid IDs",
          code: "INVALID_IDS",
        });
      }

      const studioObjectId = new mongoose.Types.ObjectId(studioId);
      const clientObjectId = new mongoose.Types.ObjectId(clientId);

      const [client, link, appointments, consultations] = await Promise.all([
        Client.findById(clientObjectId).lean(),
        ClientStudioLink.findOne({
          studioId: studioObjectId,
          clientId: clientObjectId,
        }).lean(),
        Appointment.find({
          studioId: studioObjectId,
          clientId: clientObjectId,
        })
          .populate("serviceId")
          .sort({ startsAt: -1 })
          .lean(),
        Consultation.find({
          studioId: studioObjectId,
          clientId: clientObjectId,
        })
          .sort({ startsAt: -1 })
          .lean(),
      ]);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (!link) {
        return res.status(404).json({ error: "Client not linked to this studio" });
      }

      res.json({
        actingRole: req.membership?.role || req.user?.role || null,
        client: {
          _id: client._id,
          legalName: client.legalName || "",
          preferredName: client.preferredName || "",
          pronouns: client.pronouns || "",
          email: client.email || "",
          phoneE164: client.phoneE164 || "",
          isAdult: client.isAdult === true,
          dateOfBirth: client.dateOfBirth || null,
          hasCompletedOnboarding: client.hasCompletedOnboarding === true,
          status: client.status || "active",
          createdAt: client.createdAt || null,
          updatedAt: client.updatedAt || null,
        },
        studioLink: {
          _id: link._id,
          status: link.status || "active",
          lastBookedAt: link.lastBookedAt || null,
          notesOperational: link.notesOperational || "",
          createdAt: link.createdAt || null,
          updatedAt: link.updatedAt || null,
        },
        appointments: appointments.map((appt) => ({
          _id: appt._id,
          startsAt: appt.startsAt,
          endsAt: appt.endsAt,
          status: appt.status,
          serviceName: appt.serviceId?.name || "",
          notesInternal: appt.notesInternal || "",
          createdAt: appt.createdAt || null,
        })),
        consultations: consultations.map((consult) => ({
          _id: consult._id,
          startsAt: consult.startsAt,
          status: consult.status,
          description: consult.intake?.description || "",
          preferredDate: consult.intake?.preferredDate || "",
          travelInfo: consult.intake?.travelInfo || "",
          budget: consult.intake?.budget || "",
          createdAt: consult.createdAt || null,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/staff-directory/:clientId",
  requireAuth,
  requireStudioRole(["FRONT_DESK", "ARTIST", "MANAGER", "OWNER"]),
  async (req, res, next) => {
    try {
      const studioId = getStudioIdFromRequest(req);
      const { clientId } = req.params;

      if (!studioId) {
        return res.status(400).json({
          error: "Studio context missing",
          code: "STUDIO_CONTEXT_MISSING",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(studioId) ||
        !mongoose.Types.ObjectId.isValid(clientId)
      ) {
        return res.status(400).json({
          error: "Invalid IDs",
          code: "INVALID_IDS",
        });
      }

      const studioObjectId = new mongoose.Types.ObjectId(studioId);
      const clientObjectId = new mongoose.Types.ObjectId(clientId);

      const link = await ClientStudioLink.findOneAndUpdate(
        {
          studioId: studioObjectId,
          clientId: clientObjectId,
        },
        {
          status: "inactive",
        },
        { new: true }
      );

      if (!link) {
        return res.status(404).json({
          error: "Client link not found",
        });
      }

      res.json({
        success: true,
        clientId,
      });
    } catch (err) {
      next(err);
    }
  }
);

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

router.get(
  "/intake/today",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const clientId = req.user.clientId;
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const client = await Client.findById(clientId).lean();

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const todaysAppointments = await Appointment.find({
        clientId,
        startsAt: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ["BOOKED", "CHECKED_IN", "COMPLETED"] },
      })
        .sort({ startsAt: 1 })
        .lean();

      if (!todaysAppointments.length) {
        return res.status(404).json({
          error: "No appointment found for today",
          code: "NO_APPOINTMENT_FOR_TODAY",
        });
      }

      if (todaysAppointments.length > 1) {
        return res.status(409).json({
          error: "Multiple appointments found for today",
          code: "MULTIPLE_APPOINTMENTS_FOR_TODAY",
          appointments: todaysAppointments.map((appointment) => ({
            _id: appointment._id,
            studioId: appointment.studioId,
            artistProfileId: appointment.artistProfileId || null,
            startsAt: appointment.startsAt,
            endsAt: appointment.endsAt,
            status: appointment.status,
            serviceId: appointment.serviceId || null,
          })),
        });
      }

      const appointment = todaysAppointments[0];

      let session = await ClientIntakeSession.findOne({
        clientId,
        appointmentId: appointment._id,
        isCurrent: true,
        status: { $in: ["IN_PROGRESS", "CLIENT_SIGNED", "ARTIST_REVIEWED", "COMPLETED"] },
      })
        .sort({ createdAt: -1 })
        .lean();

      if (session) {
        return res.json({
          mode: "resume",
          appointment: {
            _id: appointment._id,
            studioId: appointment.studioId,
            artistProfileId: appointment.artistProfileId || null,
            startsAt: appointment.startsAt,
            endsAt: appointment.endsAt,
            status: appointment.status,
            serviceId: appointment.serviceId || null,
          },
          session,
        });
      }

      const lastCompleted = await ClientIntakeSession.findOne({
        clientId,
        status: "COMPLETED",
      })
        .sort({ serviceDate: -1, createdAt: -1 })
        .lean();

      const payload = buildPrefilledSessionFromSources({
        client,
        lastCompleted,
        appointment,
      });

      const created = await ClientIntakeSession.create(payload);

      const freshSession = await ClientIntakeSession.findById(created._id).lean();

      await Client.findByIdAndUpdate(clientId, {
        lastServiceIntakeAt: freshSession.createdAt,
        serviceIntakeRetainUntil: freshSession.retainUntil,
      });

      return res.status(201).json({
        mode: "created",
        appointment: {
          _id: appointment._id,
          studioId: appointment.studioId,
          artistProfileId: appointment.artistProfileId || null,
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
          status: appointment.status,
          serviceId: appointment.serviceId || null,
        },
        session: freshSession,
      });
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

router.post(
  "/staff-directory",
  requireAuth,
  requireStudioRole(["FRONT_DESK", "ARTIST", "MANAGER", "OWNER"]),
  async (req, res, next) => {
    try {
      const studioId = getStudioIdFromRequest(req);

      if (!studioId) {
        return res.status(400).json({
          error: "Studio context missing",
        });
      }

      const {
        legalName,
        preferredName,
        pronouns,
        email,
        phoneE164,
        isAdult,
        dateOfBirth,
        duplicateAction,
      } = req.body;

      if (!legalName && !preferredName) {
        return res.status(400).json({
          error: "Name required",
        });
      }

      if (!email && !phoneE164) {
        return res.status(400).json({
          error: "Email or phone required",
        });
      }

      // duplicate detection
      let existingClient = null;

      if (phoneE164) {
        existingClient = await Client.findOne({
          phoneE164,
        });
      }

      if (!existingClient && email) {
        existingClient = await Client.findOne({
          email,
        });
      }

      if (
        existingClient &&
        duplicateAction !== "use_existing" &&
        duplicateAction !== "create_new"
      ) {
        return res.status(409).json({
          duplicate: true,
          error: "Client already exists",
          client: {
            _id: existingClient._id,
            legalName: existingClient.legalName || "",
            preferredName: existingClient.preferredName || "",
            pronouns: existingClient.pronouns || "",
            email: existingClient.email || "",
            phoneE164: existingClient.phoneE164 || "",
            isAdult: existingClient.isAdult === true,
            dateOfBirth: existingClient.dateOfBirth || null,
          },
        });
      }

      let client;
      const duplicate = Boolean(existingClient);

      if (existingClient && duplicateAction === "use_existing") {
        client = existingClient;
      } else {
        client = await Client.create({
          legalName: legalName || "",
          preferredName: preferredName || "",
          pronouns: pronouns || "",
          email: email || "",
          phoneE164: phoneE164 || "",
          isAdult: isAdult === true,
          dateOfBirth: dateOfBirth || null,
          status: "active",
        });
      }

      // ensure studio link exists
      await ClientStudioLink.findOneAndUpdate(
        {
          studioId,
          clientId: client._id,
        },
        {
          studioId,
          clientId: client._id,
          status: "active",
          lastBookedAt: new Date(),
        },
        {
          upsert: true,
          new: true,
        }
      );

      res.status(201).json({
        duplicate,
        client: {
          _id: client._id,
          legalName: client.legalName || "",
          preferredName: client.preferredName || "",
          pronouns: client.pronouns || "",
          email: client.email || "",
          phoneE164: client.phoneE164 || "",
          isAdult: client.isAdult === true,
          dateOfBirth: client.dateOfBirth || null,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;