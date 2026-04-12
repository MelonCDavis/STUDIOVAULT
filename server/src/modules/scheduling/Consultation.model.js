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

    expiresAt: {
      type: Date,
      index: true,
    },
    
    intake: {
      description: { type: String },
      preferredDate: { type: String },
      travelInfo: { type: String },
      budget: { type: String },
      imageRefs: [
        {
          id: { type: String },
          name: { type: String },
          url: { type: String },
          kind: {
            type: String,
            enum: ["reference"],
            default: "reference",
          },
          status: {
            type: String,
            enum: ["placeholder", "uploaded"],
            default: "placeholder",
          },
        },
      ],
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
        type: {
          type: String,
          enum: [
            "REQUEST_CREATED",
            "CLIENT_REQUEST",
            "ARTIST_REPLY",
            "REQUEST_APPROVED",
            "REQUEST_DECLINED",
            "CONSULTATION_CONFIRMED",
            "APPOINTMENT_LINK_SENT",
            "APPOINTMENT_CONFIRMED",
          ],
          default: "CLIENT_REQUEST",
        },
        body: {
          type: String,
          required: true,
        },
        visibleToClient: {
          type: Boolean,
          default: true,
        },
        imageRefs: [
          {
            id: { type: String },
            name: { type: String },
            url: { type: String },
            kind: {
              type: String,
              enum: ["reference"],
              default: "reference",
            },
            status: {
              type: String,
              enum: ["placeholder", "uploaded"],
              default: "placeholder",
            },
          },
        ],
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
