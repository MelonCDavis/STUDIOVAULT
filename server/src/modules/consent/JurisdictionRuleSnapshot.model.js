const mongoose = require("mongoose");
const StudioMembershipModel = require("../studios/StudioMembership.model");

const JurisdictionRuleSnapshotSchema = new mongoose.Schema(
    {
        studioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Studio",
            required: true,
            index: true,
        },
        effectiveAt: {
            type: Date,
            required: true,
        },
        retentionYearsMinimum: {
            type: Number,
            required: true,
            min: 1,
        },
        requiresGuardianForMinors: {
            type: Boolean,
            default: true,
        },
        acceptedMinorIdTypes: {
            type: Boolean,
            default: false,
        },
        requiresNeedleLotLogging: {
            type: Boolean,
            default: false,
        },
        notes: String,
    },
    {
        timestamps: true,
    }
);

modules.exports = mongoose.model("JurisdictionRuleSnapshot", JurisdictionRuleSnapshotSchema);