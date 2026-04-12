const express = require("express");
const router = express.Router();
const { requireAuth, requireStaff } = require("../auth/auth.middleware");
const Consultation = require("./Consultation.model");
const { computeConsultationSlots } = require("./availability/computeConsultationSlots");
const mongoose = require("mongoose");
const Client = require("../clients/Client.model");
const ClientStudioLink = require("../clients/ClientStudioLink.model");

async function resolveConsultationClient({
  clientId,
  legalName,
  preferredName,
  pronouns,
  phone,
  email,
  isAdult,
  dateOfBirth,
  forceCreate = false,
}) {
  if (clientId) {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      const err = new Error("Invalid clientId");
      err.status = 400;
      throw err;
    }

    return {
      duplicate: false,
      clientId,
      existingClient: null,
    };
  }

  const normalizedLegalName = (legalName || "").trim();
  const normalizedPreferredName = (preferredName || "").trim();
  const normalizedPronouns = (pronouns || "").trim();
  const normalizedPhone = (phone || "").trim();
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (!normalizedLegalName && !normalizedPreferredName) {
    const err = new Error("Legal name or preferred name is required when no clientId is provided");
    err.status = 400;
    throw err;
  }

  if (!normalizedPhone && !normalizedEmail) {
    const err = new Error("Phone or email is required when no clientId is provided");
    err.status = 400;
    throw err;
  }

    let existingClient = null;

  if (!forceCreate) {
    if (normalizedPhone) {
      existingClient = await Client.findOne({
        phoneE164: normalizedPhone,
      });
    }

    if (!existingClient && normalizedEmail) {
      existingClient = await Client.findOne({
        email: normalizedEmail,
      });
    }
  }

  if (existingClient) {
    return {
      duplicate: true,
      clientId: existingClient._id,
      existingClient,
    };
  }

    const createdClient = await Client.create({
    legalName: normalizedLegalName || normalizedPreferredName,
    preferredName: normalizedPreferredName || undefined,
    pronouns: normalizedPronouns || undefined,
    phoneE164: normalizedPhone || undefined,
    email: normalizedEmail || undefined,
    isAdult: typeof isAdult === "boolean" ? isAdult : true,
    dateOfBirth: !isAdult && dateOfBirth ? dateOfBirth : undefined,
    status: "active",
  });

  return {
    duplicate: false,
    clientId: createdClient._id,
    existingClient: null,
  };
}

// POST /api/staff/consultations
router.post(
  "/consultations",
  requireAuth,
  requireStaff,
  async (req, res, next) => {
    try {
      const {
        studioId,
        artistProfileId,
        clientId,
        legalName,
        preferredName,
        pronouns,
        phone,
        email,
        isAdult,
        dateOfBirth,
        startsAt,
        message,
        imageRefs,
        forceCreate = false,
      } = req.body;

      if (!studioId || !artistProfileId || !startsAt) {
        return res.status(400).json({
          error: "studioId, artistProfileId, and startsAt are required",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(studioId) ||
        !mongoose.Types.ObjectId.isValid(artistProfileId)
      ) {
        return res.status(400).json({
          error: "Invalid id format",
        });
      }

      const resolvedClient = await resolveConsultationClient({
        clientId,
        legalName,
        preferredName,
        pronouns,
        phone,
        email,
        isAdult,
        dateOfBirth,
        forceCreate,
      });

      if (resolvedClient.duplicate) {
        return res.status(409).json({
          error: "Duplicate client found",
          duplicate: true,
          existingClient: {
            _id: resolvedClient.existingClient._id,
            legalName: resolvedClient.existingClient.legalName || "",
            preferredName: resolvedClient.existingClient.preferredName || "",
            pronouns: resolvedClient.existingClient.pronouns || "",
            email: resolvedClient.existingClient.email || "",
            phoneE164: resolvedClient.existingClient.phoneE164 || "",
          },
        });
      }

      const resolvedClientId = resolvedClient.clientId;

      const normalizedImageRefs = Array.isArray(imageRefs)
        ? imageRefs
            .map((img, index) => ({
              id: String(img?.id || `placeholder-${index + 1}`),
              name: String(img?.name || `Reference ${index + 1}`),
              url: String(img?.url || "").trim(),
              kind: "reference",
              status: img?.status === "uploaded" ? "uploaded" : "placeholder",
            }))
            .filter((img) => img.name || img.url)
        : [];

      const consultation = await Consultation.create({
        studioId,
        artistProfileId,
        clientId: resolvedClientId,
        startsAt: new Date(startsAt),
        status: "REQUESTED",
        intake: {
          description: message || "",
          imageRefs: normalizedImageRefs,
        },
        messages: [
          {
            sender: "SYSTEM",
            type: "REQUEST_CREATED",
            body: "Consultation request created.",
            visibleToClient: true,
            imageRefs: [],
          },
          {
            sender: "CLIENT",
            type: "CLIENT_REQUEST",
            body: message || "Client consultation request.",
            visibleToClient: true,
            imageRefs: normalizedImageRefs,
          },
        ],
      });

      await ClientStudioLink.findOneAndUpdate(
        {
          studioId,
          clientId: resolvedClientId,
        },
        {
          $set: {
            status: "active",
            lastBookedAt: new Date(startsAt),
          },
          $setOnInsert: {
            studioId,
            clientId: resolvedClientId,
          },
        },
        {
          new: true,
          upsert: true,
        }
      );

      const populated = await Consultation.findById(consultation._id)
        .populate("clientId", "legalName email phoneE164");

      res.status(201).json(populated);
    } catch (err) {
      next(err);
    }
  }
);

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
        .populate("clientId", "legalName email phoneE164")
        .lean();

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

      // system message
      consultation.messages.push({
        sender: "SYSTEM",
        type: "REQUEST_APPROVED",
        body: "Consultation request approved.",
        visibleToClient: true,
        imageRefs: [],
      });

      // optional artist message
      if (req.body?.message) {
        consultation.messages.push({
          sender: "ARTIST",
          type: "ARTIST_REPLY",
          body: req.body.message,
          visibleToClient: true,
          imageRefs: [],
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

      consultation.messages.push({
        sender: "SYSTEM",
        type: "REQUEST_DECLINED",
        body: "Consultation request declined.",
        visibleToClient: true,
        imageRefs: [],
      });

      if (req.body?.message) {
        consultation.messages.push({
          sender: "ARTIST",
          type: "ARTIST_REPLY",
          body: req.body.message,
          visibleToClient: true,
          imageRefs: [],
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