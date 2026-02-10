const mongoose = require("mongoose");

const InspectionQuerySchema = new mongoose.Schema(
    {
        studioId: {
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
        filters: {
            startDate: Date,
            endDate: Date,
            artistProfileId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ArtistProfile",
            },
            serviceId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Service",
            },
        },
        mode: {
            type: String,
            enum: ["INSPECTION"],
            default: "INSPECTION",
        },
    },    
    {
       timestamps: true,
    }
);

InspectionQuerySchema.index({ studioId: 1, createdAt: -1 });

module.exports = mongoose.model("InspectionQuery", InspectionQuerySchema);