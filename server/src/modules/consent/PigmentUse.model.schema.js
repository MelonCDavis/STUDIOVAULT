const mongoose = require("mongoose");

const PigementUseScema = new mongoose.Schema(
    {
        consentPacketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ConsentPacket",
            required: true,
            index: true,
        },
        pigmentBottleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PigmentBottle",
            required: true,
        },
        // Snapshot for audits even if bottle later changes
        brandSnapshot: String,
        colorNameSnapshot: String,
        lotNumberSnapshot: {
            type: String,
            index: true,
        },
        recordedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

PigementUseScema.index({ consentPacketId: 1, });

module.exports = mongoose.model("PigmentUse", PigementUseScema);