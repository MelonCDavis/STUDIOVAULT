const { Modal } = require("bootstrap");
const mongoose = require("mongoose");

const ClientStudioLinkSchema = new mongoose.Schema(
    {
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
            index: true,
        },
        studioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Studio",
            required: true,
            index: true,
        },
        notesOperational: {
            type: String,
        },
        lastBookedAt: Date,

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

ClientStudioLinkSchema.index(
    { clientId: 1, studioId: 1 },
    { unique: true }
);

Module.exports = mongoose.model("ClientStudioLink", ClientStudioLinkSchema);