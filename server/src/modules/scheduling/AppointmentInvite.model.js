const mongoose = require("mongoose");

const AppointmentInviteSchema = new mongoose.Schema(
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
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
      index: true,
    },
    selectedAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      index: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "USED", "EXPIRED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
      default: 60,
    },
    placementMode: {
      type: String,
      enum: ["OPEN_MAGNETIC", "CLOSE_MAGNETIC"],
      default: "OPEN_MAGNETIC",
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
      index: true,
    },
    messageToClient: {
      type: String,
      default: "",
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

AppointmentInviteSchema.index({ artistProfileId: 1, status: 1, validUntil: 1 });
AppointmentInviteSchema.index({ clientId: 1, status: 1, validUntil: 1 });

module.exports = mongoose.model("AppointmentInvite", AppointmentInviteSchema);