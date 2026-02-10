const mongoose = require("mongoose");

const MedicalDisclosureSchema = new mongoose.Schema(
    {
        consentPacketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ConsentPacket",
            required: true,
            unique: true,
            index: true,
        },
        responses: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        procedurallyReleveantFlags: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("MedicalDisclosure", MedicalDisclosureSchema);