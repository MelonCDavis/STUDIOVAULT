const express = require("express");
const router = express.Router();
const { requireAuth, requireClient } = require("../auth/auth.middleware");
const { computeConsultationSlots } = require("./availability/computeConsultationSlots");
const ConsultationSettings = require("./consultationSettings.model");
const Consultation = require("./Consultation.model");
require("../artists/ArtistProfile.model");

console.log("CONSULTATION ROUTES LOADED");

// GET /api/client/consultations/availability
router.get(
  "/consultations/availability",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const { artistProfileId, studioId, from, to } = req.query;

      if (!artistProfileId || !studioId || !from || !to) {
        return res.status(400).json({ error: "Missing required query params" });
      }

      const settings = await ConsultationSettings.findOne({
        artistProfileId,
        studioId,
      }).lean();

      if (!settings || settings.mode === "ARTIST_CONTROLLED") {
        return res.json({ slots: [] });
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

// POST /api/client/consultations/request
router.post(
  "/consultations/request",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const {
        artistProfileId,
        studioId,
        startsAt,
        description,
        preferredDate,
        travelInfo,
        budget,
        imageRefs,
      } = req.body;

      if (!artistProfileId || !studioId || !startsAt) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const settings = await ConsultationSettings.findOne({
        artistProfileId,
        studioId,
      }).lean();

      if (!settings) {
        return res.status(400).json({ error: "Consultations not enabled" });
      }

      if (settings.mode === "ARTIST_CONTROLLED") {
        return res.status(400).json({
          error: "Consultations are artist-controlled for this artist.",
        });
      }

      const dayStart = new Date(startsAt);
      dayStart.setUTCHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      const availableSlots = await computeConsultationSlots({
        artistProfileId,
        studioId,
        from: dayStart,
        to: dayEnd,
      });

      const requestedISO = new Date(startsAt).toISOString();

      const isValidSlot = availableSlots.some(
        (d) => d.toISOString() === requestedISO
      );

      if (!isValidSlot) {
        return res.status(400).json({
          error: "Selected time is not available.",
        });
      }

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
        clientId: req.user.clientId,
        startsAt: new Date(startsAt),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        intake: {
          description: description || "",
          preferredDate: preferredDate || "",
          travelInfo: travelInfo || "",
          budget: budget || "",
          imageRefs: normalizedImageRefs,
        },
        messages: [
          {
            sender: "SYSTEM",
            type: "REQUEST_CREATED",
            body: "Consultation request submitted.",
            visibleToClient: true,
            imageRefs: [],
          },
          {
            sender: "CLIENT",
            type: "CLIENT_REQUEST",
            body: description || "Client submitted a consultation request.",
            visibleToClient: true,
            imageRefs: normalizedImageRefs,
          },
        ],
      });

      res.status(201).json(consultation);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/client/consultations
router.get(
  "/consultations",
  requireAuth,
  requireClient,
  async (req, res, next) => {
    try {
      const consultations = await Consultation.find({
        clientId: req.user.clientId,
      })
        .sort({ createdAt: -1 })
        .populate("artistProfileId", "_id")
        .lean();

      res.json(
        consultations.map((consultation) => ({
          _id: consultation._id,
          studioId: consultation.studioId,
          artistProfileId: consultation.artistProfileId?._id || consultation.artistProfileId || null,
          startsAt: consultation.startsAt,
          expiresAt: consultation.expiresAt || null,
          status: consultation.status,
          intake: {
            description: consultation.intake?.description || "",
            preferredDate: consultation.intake?.preferredDate || "",
            travelInfo: consultation.intake?.travelInfo || "",
            budget: consultation.intake?.budget || "",
            imageRefs: Array.isArray(consultation.intake?.imageRefs)
              ? consultation.intake.imageRefs
              : [],
          },
          messages: Array.isArray(consultation.messages)
            ? consultation.messages
                .filter((msg) => msg.visibleToClient !== false)
                .map((msg) => ({
                  sender: msg.sender,
                  type: msg.type || "",
                  body: msg.body || "",
                  imageRefs: Array.isArray(msg.imageRefs) ? msg.imageRefs : [],
                  createdAt: msg.createdAt || null,
                }))
            : [],
          createdAt: consultation.createdAt || null,
          updatedAt: consultation.updatedAt || null,
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;