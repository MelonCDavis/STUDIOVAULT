const mongoose = require("mongoose");

const ArtistProfileSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        displayName: {
            type: String,
            required: true,
        },
        bio: String,
        avatarUrl: String,
        specialties: [String],
        isIndependent: {
            type: Boolean,
            default: false,
        },
        consultationSettings: {
            isEnabled: {
                type: Boolean,
                default: true,
            },

            allowedDurations: {
                type: [Number],
                default: [15, 30, 45, 60],
            },

            defaultDuration: {
                type: Number,
                default: 30,
            },

            placementMode: {
                type: String,
                enum: [
                    "FREEFORM",
                    "OPEN_ONLY",
                    "CLOSE_ONLY",
                    "OPEN_CLOSE",
                    "OPEN_MAGNETIC",
                    "CLOSE_MAGNETIC",
                    "OPEN_CLOSE_MAGNETIC",
                ],
                default: "OPEN_ONLY",
            },

            magneticCount: {
                type: Number,
                default: 0,
                min: 0,
            },

            holdMinutes: {
                type: Number,
                default: 30,
                min: 1,
            },

            defaultConfirmMessage: {
                type: String,
            },
        },
    },    
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("ArtistProfile", ArtistProfileSchema);