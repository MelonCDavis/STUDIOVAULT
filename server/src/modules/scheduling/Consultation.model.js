const mongoose = require("mongoose");

const ConsultationSchema = new mongoose.Schema(
  {
    studioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Studio",
      required: true,
      index: true,
    },

    artistProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArtistProfile",
      required: true,
      index: true,
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    startsAt: {
      type: Date,
      required: true,
      index: true,
    },

    intake: {
      description: { type: String },
      preferredDate: { type: String },
      travelInfo: { type: String },
      budget: { type: String },
    },

    status: {
      type: String,
      enum: [
        "REQUESTED",
        "ACCEPTED",
        "DECLINED",
        "CANCELLED_BY_CLIENT",
        "CANCELLED_BY_ARTIST",
        "EXPIRED",
        "COMPLETED",
      ],
      default: "REQUESTED",
      index: true,
    },

    messages: [
      {
        sender: {
          type: String,
          enum: ["CLIENT", "ARTIST", "SYSTEM"],
          required: true,
        },
        body: {
          type: String,
          required: true,
        },
        visibleToClient: {
          type: Boolean,
          default: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

  },
  { timestamps: true }
);

module.exports = mongoose.model("Consultation", ConsultationSchema);
