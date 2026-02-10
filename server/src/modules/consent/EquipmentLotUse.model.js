const mongoose = require("mongoose");

const EquipmentLotUseSchema = new mongoose.Schema(
    {
        consentPacketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ConsentPacket",   
            required: true,
            index: true,
        },
        category: {
            type: String,
            enum: ["TATTOO", "PIERCING"],
            required: true,
        },
        itemType: {
            type: String,
            required: true,
            // examples: NEEDLE, CARTRIDGE, JEWELRY, TUBE ETC>
        },
        lotNumber: {
            type: String,
            required: true,
        },
        manufacturer: String,
        recordedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

EquipmentLotUseSchema.index({ consentPacketId: 1, category: 1, });

module.exports = mongoose.model("EquipmentLotUse", EquipmentLotUseSchema);