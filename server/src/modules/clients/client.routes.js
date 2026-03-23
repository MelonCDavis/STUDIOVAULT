const express = require("express");
const router = express.Router();

const Client = require("./Client.model");
const ClientStudioLink = require("./ClientStudioLink.model");

const Appointment = require("../scheduling/Appointment.model");
const { requireAuth, requireClient } = require("../auth/auth.middleware");
const { requireStudioRole } = require("../../middleware/requireStudioRole");

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getStudioIdFromRequest(req) {
  return req.studio?.id || req.membership?.studioId || null;
}

function getStudioRoleFromRequest(req) {
  return (
    req.membership?.role ||
    req.studioMembership?.role ||
    req.user?.studioRole ||
    req.user?.role ||
    null
  );
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
      const studioId = getStudioIdFromRequest(req);

      if (!studioId) {
        return res.status(400).json({
          error: "Studio context missing",
          code: "STUDIO_CONTEXT_MISSING",
        });
      }

      const rawSearch = String(req.query.search || "").trim();
      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(
        Math.max(parseInt(req.query.limit || "25", 10), 1),
        100
      );
      const skip = (page - 1) * limit;

      const baseLinkMatch = {
        studioId,
        status: "active",
      };

      const clientMatch = {
        status: "active",
      };

      if (rawSearch) {
        const escaped = escapeRegex(rawSearch);
        const digitSearch = rawSearch.replace(/\D/g, "");

        const clientOr = [
          { legalName: { $regex: escaped, $options: "i" } },
          { preferredName: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } },
        ];

        if (digitSearch) {
          clientOr.push({
            phoneE164: { $regex: digitSearch, $options: "i" },
          });
        } else {
          clientOr.push({
            phoneE164: { $regex: escaped, $options: "i" },
          });
        }

        clientMatch.$or = clientOr;
      }

      const pipeline = [
        { $match: baseLinkMatch },
        {
          $lookup: {
            from: "clients",
            localField: "clientId",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $match: Object.fromEntries(
            Object.entries(clientMatch).map(([key, value]) => [`client.${key}`, value])
          ),
        },
        {
          $project: {
            _id: "$client._id",
            legalName: "$client.legalName",
            preferredName: "$client.preferredName",
            email: "$client.email",
            phoneE164: "$client.phoneE164",
            clientStatus: "$client.status",
            linkStatus: "$status",
            createdAt: "$client.createdAt",
            updatedAt: "$client.updatedAt",
            lastBookedAt: "$lastBookedAt",
            notesOperational: "$notesOperational",
          },
        },
        {
          $sort: {
            legalName: 1,
            preferredName: 1,
            createdAt: -1,
          },
        },
      ];

      const countPipeline = [...pipeline, { $count: "total" }];
      const itemsPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];

      const [countResult, items] = await Promise.all([
        ClientStudioLink.aggregate(countPipeline),
        ClientStudioLink.aggregate(itemsPipeline),
      ]);

      const total = countResult[0]?.total || 0;
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