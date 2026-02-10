const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema(
    {
        legalName: {
            type: String,
            required: true, 
            index: true,
        },
        dateOfBirth: {
            type: Date,
            required: true,
            index: true,
        },
        phoneE164: {
            type: String,
            required: true,
            index: true,
        },
        smsVerifiedAt: Date,
        email: {
            type: String,
            required: true,
            lowercase: true,
            index: true,
        },
        emailVerifiedAt: Date,
        // Operational only. Not medical. Not consent.
        emergencyContact: {
            name: String,
            phoneE164: String,
            relationship: String,
        },
        // Optional, client-controlled
        address: String,
        pronouns: String,
        preferrnedName: String,
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

// Common lookup patterns
ClientSchema.index({ email: 1, phoneE164: 1 });

module.exports = mongoose.model("Client", ClientSchema);