const mongoose = require("mongoose");

const StudioSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },

        timezone: { type: String, required: true },

        status: { type: String, enum: ["active", "inactive"], default: "active" },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Studio", StudioSchema);