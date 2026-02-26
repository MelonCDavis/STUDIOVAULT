const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, index: true },

        passwordHash: {
            type: String,
            required: true,
        },

        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            index: true,
        },

        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Staff", // or ArtistProfile depending on your model
            index: true,
        },

        role: {
            type: String,
            enum: [
                "CLIENT",
                "FRONT_DESK",
                "ARTIST",
                "MANAGER",
                "OWNER"
            ],
            default: "CLIENT",
            index: true,
        },
        
        phoneE164: { type: String, index: true },

        emailVerifiedAt: Date,
        smsVerifiedAt: Date,

        legalName: {
            type: String,
        },

        avatarUrl:  String,
        
        status: {
            type: String,
            enum: ["active", "suspended"],
            default: "active",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", userSchema);