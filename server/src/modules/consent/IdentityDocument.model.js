const mongoose = require("mongoose");

const IdentityDocumentSchema = new mongoose.Schema(
    {
        consentPacketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ConsentPacket",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["GOV_ID", "ADULT_ID", "GUARDIAN_ID", "MINOR_ID", "SCHOOL_ID", "BIRTH_CERT", "PROOF_OF_GUARDIANSHIP", "PROOF_OF_AGE", "OTHER"],
            required: true,
        },
        imageAssestId: {
            type: String,
            required: true,
        },
        capturedAt: {
            type: Date,
            default: Date.now,
        },
        capturedByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },        
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("IdentityDocument", IdentityDocumentSchema);