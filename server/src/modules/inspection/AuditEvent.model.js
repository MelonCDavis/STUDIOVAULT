const mongoose = require("mongoose");
const { act } = require("react");

const AuditEventSchema = new mongoose.Schema(
    {
        studioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Studio",
            required: true,
        },
        actorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        actorType: {
            type: String,
            enum: ["USER", "SYSTEM"],
            default: "USER",
        },
        action: {
            type: String,
            required: true,
            // examples:
            // VIEW_CONSENT
            // VIEW_INSPECTION
            // REQUEST_EXPORT
            // APPROVE_EXPORT
            // COMPLETE_EXPORT
            // ACK_HEALTH_ALERT
        },
        targetType: {
            type: String,
            required: true,
            // examples:
            // ConsentPacket
            //ExportRequest
            //InspectionQuery
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        metaData: {
            type: mongoose.Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
); 

AuditEventSchema.index({ studioId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditEvent", AuditEventSchema);