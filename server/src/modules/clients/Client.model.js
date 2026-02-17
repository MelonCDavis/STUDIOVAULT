const mongoose = require("mongoose");

const ClientSchema = new mongoose.Schema(
    {
        legalName: {
            type: String,
            required: true, 
            trim: true,
            index: true,
        },
        isAdult: {
            type: Boolean,
            required: true,
            },

            dateOfBirth: {
            type: Date,
            required: function () {
                return this.isAdult === false;
            },
            },
        phoneE164: {
            type: String,
            required: true,
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
        pronouns: String,
        preferredName: String,
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