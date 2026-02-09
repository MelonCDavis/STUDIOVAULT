const mongoose = require("mongoose");

const AvailabilityRuleSchema = new mongoose.Schema(
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
        type: {
            type: String,
            enum: ["WEEKLY", "DATE_RANGE", "OVERRIDE"],
            required: true,
        },
        DayOfWeek: {
            type: Number,
            min: 0,
            max: 6,
        },
        startTime: {
            type: String,
        },
        endTime: {
            type: String,
        },
        startDate: Date,
        endDate: Date,

        timezone: {
            type: String,
            required: true,
        },
        buffers: {
            beforeMinutes: {
                type: Number,
                default: 0,
                min: 0,
            },
            afterMinutes: {
                type: Number,
                default: 0,
                min: 0,
            },
        },
        concurrency: {
            type: Number,
            default: 1,
            min: 1,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

AvailabilityRuleSchema.index({
    studioId: 1,
    artistProfileId: 1,
    type: 1,
});

module.exports = mongoose.model("AvailabilityRule", AvailabilityRuleSchema);