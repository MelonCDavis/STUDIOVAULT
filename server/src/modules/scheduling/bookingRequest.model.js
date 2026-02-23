const mongoose = require("mongoose");
const crypto = require("crypto");

const BookingRequestSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

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

    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "USED", "EXPIRED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true }
);

BookingRequestSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = mongoose.model("BookingRequest", BookingRequestSchema);
