const Consultation = require("./Consultation.model");
const Appointment = require("./Appointment.model");

async function expireConsultations() {
  try {
    const now = new Date();

    const expired = await Consultation.find({
      status: "REQUESTED",
      expiresAt: { $lt: now },
    });

    if (!expired.length) return;

    for (const consultation of expired) {
      const appointment = await Appointment.findById(
        consultation.appointmentId
      );

      if (appointment) {
        appointment.status = "CANCELLED";
        appointment.holdExpiresAt = undefined;
        await appointment.save();
      }

      consultation.status = "EXPIRED";

      consultation.messages.push({
        sender: "SYSTEM",
        body: "Consultation request expired due to no response.",
        visibleToClient: true,
      });

      await consultation.save();
    }

    console.log(`Expired ${expired.length} consultations`);
  } catch (err) {
    console.error("Consultation expiration error:", err);
  }
}

module.exports = { expireConsultations };