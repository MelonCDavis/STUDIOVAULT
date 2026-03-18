const ConsultationSettings = require("./consultationSettings.model");

async function getConsultationSettings(req, res) {
  try {
    const { studioId, artistProfileId } = req.query;

    if (!studioId || !artistProfileId) {
      return res.status(400).json({
        error: "studioId and artistProfileId are required",
      });
    }

    const settings = await ConsultationSettings.findOne({
      studioId,
      artistProfileId,
    });

    if (!settings) {
      return res.json({
        studioId,
        artistProfileId,
        mode: "OPEN_ONLY",
        consultationDurationMinutes: 30,
        startDate: null,
        endDate: null,
        cascadeCount: 1,
      });
    }

    return res.json(settings);
  } catch (error) {
    console.error("getConsultationSettings error:", error);
    return res.status(500).json({
      error: "Failed to load consultation settings",
    });
  }
}

async function updateConsultationSettings(req, res) {
  try {
    const {
      studioId,
      artistProfileId,
      mode,
      consultationDurationMinutes,
      startDate,
      endDate,
      cascadeCount,
    } = req.body;

    if (!studioId || !artistProfileId) {
      return res.status(400).json({
        error: "studioId and artistProfileId are required",
      });
    }

    const updated = await ConsultationSettings.findOneAndUpdate(
      { studioId, artistProfileId },
      {
        studioId,
        artistProfileId,
        mode,
        consultationDurationMinutes,
        startDate,
        endDate,
        cascadeCount,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json(updated);
  } catch (error) {
    console.error("updateConsultationSettings error:", error);
    return res.status(500).json({
      error: "Failed to save consultation settings",
    });
  }
}

module.exports = {
  getConsultationSettings,
  updateConsultationSettings,
};