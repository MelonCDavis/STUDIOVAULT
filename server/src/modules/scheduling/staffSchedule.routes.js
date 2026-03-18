const express = require("express");
const router = express.Router();

const StaffSchedule = require("./StaffSchedule.model");
const { requireAuth } = require("../auth/auth.middleware");
const { httpError } = require("../../utils/httpError");

function requireStaffLike(req, res, next) {
  const allowed = ["FRONT_DESK", "ARTIST", "MANAGER", "OWNER"];

  if (!req.user || !allowed.includes(req.user.role)) {
    return next(httpError(403, "Staff access only"));
  }

  next();
}

router.get(
  "/schedule",
  requireAuth,
  requireStaffLike,
  async (req, res, next) => {
    try {
      const { studioId, artistProfileId } = req.query;

      if (!studioId || !artistProfileId) {
        return next(httpError(400, "studioId and artistProfileId are required"));
      }

      const schedule = await StaffSchedule.findOne({
        studioId,
        artistProfileId,
      }).lean();

      res.json(schedule || null);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/schedule",
  requireAuth,
  requireStaffLike,
  async (req, res, next) => {
    try {
      const {
        studioId,
        artistProfileId,
        workMode,
        startDate,
        endDate,
        daysOfWeek,
        startTime,
        endTime,
      } = req.body;

      if (!studioId || !artistProfileId || !workMode || !startDate || !endDate) {
        return next(httpError(400, "Missing required schedule fields"));
      }

      if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
        return next(httpError(400, "At least one day of week is required"));
      }

      if (
        workMode === "SET_SCHEDULE" &&
        (!startTime || !endTime)
      ) {
        return next(httpError(400, "Start and end time are required for set schedule"));
      }

      const updated = await StaffSchedule.findOneAndUpdate(
        { studioId, artistProfileId },
        {
          studioId,
          artistProfileId,
          workMode,
          startDate,
          endDate,
          daysOfWeek,
          startTime: workMode === "SET_SCHEDULE" ? startTime : "",
          endTime: workMode === "SET_SCHEDULE" ? endTime : "",
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      ).lean();

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;