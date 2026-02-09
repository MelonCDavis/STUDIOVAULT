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
    },    
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("ArtistProfile", ArtistProfileSchema);