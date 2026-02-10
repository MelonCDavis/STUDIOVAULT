const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema(
    {
        studioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Studio",
            required: true,
            index: true,
        },
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
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
        startsAt: {
            type: Date,
            required: true,
            index: true,
        },
        endsAt: {
            type: Date,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: [
                "HELD",
                "BOOKED",
                "CHECKED_IN",
                "COMPLETED",
                "CANCELLED",
                "NO_SHOW",
            ],
            default: "BOOKED",
            index: true,
        },
        deposit: {
            requiredAmountCents: {
                type: Number,
                min: 0,
            },
            paidAmountCents: {
                type: Number,
                min: 0,
            },
            provider: {
                type: String,
            },
            paymentId: {
                type: String,
            },
            paidAt: Date,
        },

        reminderState: {
            scheduledFor24h: {
                type: Boolean,
                default: false,
            },
            sentAt24h: Date,

            deliveryStatus: {
                type: String,
                enum: ["PENDING", "SENT", "FAILED"],
            },
        },
        createdBy: {
            type: String,
            enum: ["CLIENT", "FSTAFF", "SYSTEM"],
        },
        notesInternal: {
            type: String,
        },        
    },
    {
        timestamps: true,
    }
);
AppointmentSchema.index({ studioId: 1, startsAt: 1 });
AppointmentSchema.index({ artistProfileId: 1, startsAt: 1 });

module.exports = mongoose.model("Appointment", AppointmentSchema);