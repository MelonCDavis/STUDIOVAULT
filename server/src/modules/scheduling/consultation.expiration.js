const Consultation = require("./Consultation.model");

async function expireConsultations() {
  try {
    const now = new Date();

    const expired = await Consultation.find({
      status: "REQUESTED",
      expiresAt: { $lt: now },
    });

    if (!expired.length) return;

    for (const consultation of expired) {
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