const mongoose = require("mongoose");

const ConsentPacketSchema = new mongoose.Schema(
    {
        studioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Studio",
            required: true,
            index: true,
        },
        appoinmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
            required: true,
            unique: true,
            index: true,
        },
        artistProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ArtistProfile",
            required: true,
            index: true,
        },
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
            index: true,
        },
        jurisdictionSnapshotId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JurisdictionSnapshot",
            required: true,
        },
        status: {
            type: String,
            enum: ["NOT_STARTED", "IN_PROGRESS", "SIGNED", "VOID"],
            default: "NOT_STARTED",
            index: true,
        },
        signedAt: Date,
        artistAcknowledgedAt: Date,
        artistAcknowledgedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",

        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("ConsentPacket", ConsentPacketSchema);