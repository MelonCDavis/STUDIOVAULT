const mongoose = require("mongoose");

const StaffScheduleSchema = new mongoose.Schema(
  {
    studioId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    artistProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    workMode: {
      type: String,
      enum: ["SET_SCHEDULE", "BY_APPOINTMENT_ONLY"],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    daysOfWeek: {
      type: [Number],
      default: [],
    },

    startTime: {
      type: String,
      default: "",
    },

    endTime: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

StaffScheduleSchema.index({ studioId: 1, artistProfileId: 1 });

module.exports = mongoose.model("StaffSchedule", StaffScheduleSchema);