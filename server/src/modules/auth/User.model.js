const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, index: true },

        phoneE164: { type: String, index: true },

        emailVerifiedAt: Date,
        smsVerifiedAt: Date,

        legalName: {
            type: String,
        },

        avatarUrl:  String,
        
        status: {
            type: String,
            enum: ["active", "suspended"],
            default: "active",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);