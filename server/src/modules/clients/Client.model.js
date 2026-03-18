const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema(
    {
        legalName: {
            type: String,
            trim: true,
            index: true,
        },
        preferredName: {
            type: String,
            trim: true,
            },

        pronouns: {
            type: String,
            trim: true,
            },
            
        isAdult: {
            type: Boolean,
            },

            dateOfBirth: {
                type: Date,
            },
        hasCompletedOnboarding: {
            type: Boolean,
            default: false,
            },
        phoneE164: {
            type: String,
            trim: true,
            index: true,
        },
        smsVerifiedAt: Date,
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
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