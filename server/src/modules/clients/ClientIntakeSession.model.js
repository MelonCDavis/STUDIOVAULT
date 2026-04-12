const mongoose = require("mongoose");

const ClientIntakeSessionSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    studioId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
      index: true,
    },
    artistProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArtistProfile",
      default: null,
    },
    sourceIntakeSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientIntakeSession",
      default: null,
    },

    status: {
      type: String,
      enum: [
        "IN_PROGRESS",
        "CLIENT_SIGNED",
        "ARTIST_REVIEWED",
        "COMPLETED",
        "VOID",
      ],
      default: "IN_PROGRESS",
      index: true,
    },

    serviceDate: {
      type: Date,
      required: true,
      index: true,
    },

    profileSnapshot: {
      legalName: String,
      preferredName: String,
      pronouns: String,
      dateOfBirth: Date,
      isAdult: Boolean,
      phoneE164: String,
      email: String,
      address: String,
      emergencyContact: {
        name: String,
        phoneE164: String,
        relationship: String,
      },
      photoIdImageUrl: String,
      photoIdType: String,
      photoIdVerifiedAt: Date,
      photoIdVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },

    healthSnapshot: {
      allergies: {
        type: [String],
        default: [],
      },
      medications: {
        type: [String],
        default: [],
      },
      medicalConditions: {
        type: [String],
        default: [],
      },
      eatenRecently: {
        type: String,
        enum: ["YES", "NO", "DECLINED"],
        default: "DECLINED",
      },
      underInfluence: {
        type: String,
        enum: ["YES", "NO", "DECLINED"],
        default: "DECLINED",
      },
      notes: {
        type: String,
        default: "",
      },
    },

    consentSnapshot: {
      consentVersion: {
        type: String,
        default: "v1",
      },
      agreedPermanency: {
        type: Boolean,
        default: false,
      },
      agreedSubjectiveArt: {
        type: Boolean,
        default: false,
      },
      agreedNoMedicalAdvice: {
        type: Boolean,
        default: false,
      },
      agreedSoberStatement: {
        type: Boolean,
        default: false,
      },
      agreedTruthfulInformation: {
        type: Boolean,
        default: false,
      },
    },

    clientSignature: {
      signedName: {
        type: String,
        default: "",
      },
      signedAt: {
        type: Date,
        default: null,
      },
      signatureImageUrl: {
        type: String,
        default: "",
      },
    },

    artistReview: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
      artistSignedName: {
        type: String,
        default: "",
      },
      artistSignedAt: {
        type: Date,
        default: null,
      },
      flaggedSummary: {
        type: String,
        default: "",
      },
      notes: {
        type: String,
        default: "",
      },
    },

    procedureCompliance: {
      pigmentLots: {
        type: [String],
        default: [],
      },
      needleLots: {
        type: [String],
        default: [],
      },
      jewelryLots: {
        type: [String],
        default: [],
      },
      jurisdictionNotes: {
        type: String,
        default: "",
      },
    },

    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },

    retainUntil: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ClientIntakeSessionSchema.index({ clientId: 1, studioId: 1, createdAt: -1 });
ClientIntakeSessionSchema.index({ studioId: 1, serviceDate: 1 });

module.exports = mongoose.model("ClientIntakeSession", ClientIntakeSessionSchema);