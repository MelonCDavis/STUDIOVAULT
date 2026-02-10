const mongoose = require("mongoose");
const StudioMembershipModel = require("../studios/StudioMembership.model");
const { request } = require("../../app");

const ExportRequestSchema = new mongoose.Schema(
    {
        StudioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Studio",
            required: true, 
            index: true,
        },
        requestedByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reason: {
            type: String,
            enum: ["HEALTH_DEPARTMENT", "RECALL", "COURT_ORDER"],
            required: true,
        },
        scope : {
            appoinmentIds: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Appointment",
                },
            ],
            startDate: Date,
            endDate: Date,
            artistProfileId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ArtistProfile",
            },
        },
        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
            default: "PENDING",
            index: true,
        },
        approvedByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        approvedAt: Date,
        completedAt: Date,
    },
    {
        timestamps: true,
    }
);
ExportRequestSchema.index({ StudioId: 1, status: 1 });

module.exports = mongoose.model("ExportRequest", ExportRequestSchema);