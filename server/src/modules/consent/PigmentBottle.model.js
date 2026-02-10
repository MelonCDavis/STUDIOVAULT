const mongoose = require("mongoose");

const PigementBottleSchema = new mongoose.Schema(
    {
        artistProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ArtistProfile",
            required: true,
            index: true,
        },
        brand: {
            type: String,
            required: true,
        },
        colorName: {
            type: String,
            required: true,
        },
        lotNumber: {
            type: String,
            required: true,
            index: true,
        },
        expiredAt: Date,
        status: {
            type: String,
            enum: ["ACTIVE", "RETIRED"],
            default: "ACTIVE",
        },
    },
    {
        timestamps: true,
    }
);

PigementBottleSchema.index({ artistProfileId: 1, lotNumber: 1 }, { unique: true });

module.exports = mongoose.model("PigmentBottle", PigementBottleSchema);