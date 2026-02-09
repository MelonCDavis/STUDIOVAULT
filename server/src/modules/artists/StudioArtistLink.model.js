const mongoose = require("mongoose");

const StudioArtistLinkSchema = new mongoose.Schema(
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
        isGuest: {
            type: Boolean,
            default: false,
        },
        guestStart: Date,
        guestEnd: Date,

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
    },
    {
        timestamps: true,
    }
);

modules.exports = mongoose.model("StudioArtistLink", StudioArtistLinkSchema);