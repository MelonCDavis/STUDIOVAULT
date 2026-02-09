const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
    {
        studioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Studio",
            required: true,
            index: true,
        },
        category: {
            type: String,
            enum: ["TATTOO", "PIERCING"],
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        durationMinutes: {
            type: Number,
            required: true,
            min: 1,
        },
        depositPolicy: {
            required: {
                type: Boolean,
                default: false,
            },
            amountCents: {
                type: Number,
                min: 0,
            },
        },
        anatomyOptions: [
            {
                type: String,
            },
        ],
        requiresGuardianRules: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

ServiceSchema.index({ studioId: 1, category: 1});

module.exports = mongoose.model("Service", ServiceSchema);