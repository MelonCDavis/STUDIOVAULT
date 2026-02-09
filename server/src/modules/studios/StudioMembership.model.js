const mongoose = require("mongoose");

const StudioMembershipSchema = new mongoose.Schema(
    {
        studioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Studio",
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        role: {
            type: String,
            enum: ["FRONT_DESK", "ARTIST", "MANAGER", "OWNER"],
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        startsAt: {
            type: Date,
            default: Date.now,
        },
        endsAt: Date,
    },
    {
        timestamps: true,
    }
);

StudioMembershipSchema.index(
    { studioID: 1, userId: 1},
    { unique: true }
);

module.exports = mongoose.model("StudioMembership", StudioMembershipSchema);