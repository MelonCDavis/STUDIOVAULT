const mongoose = require("mongoose");

const consultationSettingsSchema = new mongoose.Schema(
  {
    studioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Studio",
      required: true,
    },
    artistProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArtistProfile",
      required: true,
    },

    mode: {
      type: String,
      required: true,
      enum: [
        "OPEN_ONLY",
        "CLOSE_ONLY",
        "OPEN_MAGNETIC",
        "CLOSE_MAGNETIC",
        "FULLY_OPEN",
        "ARTIST_CONTROLLED",
      ],
    },

    consultationDurationMinutes: {
      type: Number,
      required: true,
      default: 30,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    cascadeCount: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// Prevent duplicate configs per artist per studio
consultationSettingsSchema.index(
  { studioId: 1, artistProfileId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "ConsultationSettings",
  consultationSettingsSchema
);