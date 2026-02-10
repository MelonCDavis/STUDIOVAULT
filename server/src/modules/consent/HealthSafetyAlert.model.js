const mongoose = require("mongoose");

const HealthSafetyAlertSchema = new mongoose.Schema(
    {
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
            required: true,
            index: true,
        },
        consentPacketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ConsentPacket",
            required: true,
            index: true,
        },
        artistProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ArtistProfile",
            required: true,
            index: true,
        },
        triggeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            enum: ["MEDICAL_DISCLOSURE"],
            required: true,
        },
        summary: {
            type: String,
            required: true,
        },
        visibleToUserIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        acknowledgedAt: Date,
        acknowledgedBtUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

HealthSafetyAlertSchema.index({ appointmentId: 1, acknowledgedAt: 1, });

Module.exports = mongoose.model("HealthSafetyAlert", HealthSafetyAlertSchema);