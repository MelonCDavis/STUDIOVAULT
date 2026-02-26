const mongoose = require("mongoose");

const ConsultationRequestSchema = new mongoose.Schema(
    {
        studioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Studio",
            required: true,
            index: true,
        },
        artistProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ArtistProfile",
            required: true,
            index: true,
        },
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
            index: true,
        },
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
            required: true,
        },

        formData: {
            clientName: String,
            phone: String,
            email: String,
            isLocal: Boolean,
            budget: String,
            designDescription: String,
            cancellationListOptIn: Boolean,
            photoUrls: [String],
        },

        status: {
            type: String,
            enum: ["PENDING", "APPROVED", "DECLINED", "EXPIRED"],
            default: "PENDING",
            index: true,
        },

        artistMessage: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("ConsultationRequest", ConsultationRequestSchema);
