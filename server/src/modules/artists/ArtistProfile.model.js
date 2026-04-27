const mongoose = require("mongoose");

const ArtistProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    bookingAlias: {
      type: String,
      trim: true,
      index: true,
    },

    instagramHandle: {
      type: String,
      trim: true,
    },

    locationLabel: {
      type: String,
      trim: true,
    },

    bio: {
      type: String,
      default: "",
    },

    avatarUrl: {
      type: String,
      default: "",
    },

    specialties: {
      type: [String],
      default: [],
    },

    isIndependent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ArtistProfile", ArtistProfileSchema);