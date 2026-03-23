const { DateTime } = require("luxon");
const Appointment = require("../Appointment.model");
const Consultation = require("../Consultation.model");
const AvailabilityRule = require("../AvailabilityRule.model");
const ConsultationSettings = require("../consultationSettings.model");

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function isActiveAppointment(appt, now) {
  if (["BOOKED", "CHECKED_IN", "COMPLETED"].includes(appt.status)) return true;
  if (appt.status === "HELD" && appt.holdExpiresAt && appt.holdExpiresAt > now) return true;
  return false;
}

function isActiveConsult(consult) {
  return ["REQUESTED", "ACCEPTED"].includes(consult.status);
}

async function computeConsultationSlots({
  artistProfileId,
  studioId,
  from,
  to,
}) {
  const startDate = new Date(from);
  const endDate = new Date(to);
  const now = new Date();

  const settings = await ConsultationSettings.findOne({
    artistProfileId,
    studioId,
  }).lean();

  if (!settings) return [];

  const consultDuration = settings.consultationDurationMinutes || 30;
  const placementMode = settings.mode || "OPEN_ONLY";
  const magneticCount = Math.max(0, (settings.cascadeCount || 1) - 1);

  if (placementMode === "ARTIST_CONTROLLED") return [];

  const settingsStart = settings.startDate ? new Date(settings.startDate) : null;
  const settingsEnd = settings.endDate ? new Date(settings.endDate) : null;

  if (settingsStart && endDate < settingsStart) return [];
  if (settingsEnd && startDate > settingsEnd) return [];

  const weeklyRules = await AvailabilityRule.find({
    artistProfileId,
    studioId,
    type: "WEEKLY",
    isActive: true,
  }).lean();

  if (!weeklyRules.length) return [];

  const appointments = await Appointment.find({
    artistProfileId,
    studioId,
    startsAt: { $lt: endDate },
    endsAt: { $gt: startDate },
  }).lean();

  const consultUpperBound = new Date(
    endDate.getTime() + (magneticCount * consultDuration * 60000) + 1
  );

  const consultations = await Consultation.find({
    artistProfileId,
    studioId,
    startsAt: { $lt: consultUpperBound },
    status: { $in: ["REQUESTED", "ACCEPTED"] },
  }).lean();

  const studioTz = weeklyRules[0].timezone || "America/New_York";
  const results = [];

  let dayCursor = DateTime.fromJSDate(startDate, { zone: studioTz }).startOf("day");
  const endCursor = DateTime.fromJSDate(endDate, { zone: studioTz }).startOf("day");

  while (dayCursor <= endCursor) {
    const jsDay = dayCursor.weekday === 7 ? 0 : dayCursor.weekday;
    const rulesForDay = weeklyRules.filter((r) => r.DayOfWeek === jsDay);

    for (const rule of rulesForDay) {
      const tz = rule.timezone || studioTz;

      const [sh, sm] = rule.startTime.split(":").map(Number);
      const [eh, em] = rule.endTime.split(":").map(Number);

      const windowStart = dayCursor
        .setZone(tz)
        .set({ hour: sh, minute: sm, second: 0, millisecond: 0 })
        .toJSDate();

      const windowEnd = dayCursor
        .setZone(tz)
        .set({ hour: eh, minute: em, second: 0, millisecond: 0 })
        .toJSDate();

      if (!(windowStart < windowEnd)) continue;
      if (settingsStart && windowEnd < settingsStart) continue;
      if (settingsEnd && windowStart > settingsEnd) continue;

      const clampedStart = windowStart < startDate ? startDate : windowStart;
      const clampedEnd = windowEnd > endDate ? endDate : windowEnd;

      if (!(clampedStart < clampedEnd)) continue;

      const nonConsultBoundary =
        appointments
          .filter(
            (a) =>
              isActiveAppointment(a, now) &&
              a.startsAt >= clampedStart &&
              a.startsAt < clampedEnd
          )
          .map((a) => a.startsAt)
          .sort((a, b) => a - b)[0] || clampedEnd;

      function appointmentBlocks(slotStart, slotEnd) {
        return appointments.some(
          (a) =>
            isActiveAppointment(a, now) &&
            overlaps(slotStart, slotEnd, a.startsAt, a.endsAt)
        );
      }

      function consultOccupies(slotStart, slotEnd) {
        return consultations.some(
          (c) =>
            isActiveConsult(c) &&
            overlaps(
              slotStart,
              slotEnd,
              c.startsAt,
              addMinutes(c.startsAt, consultDuration)
            )
        );
      }

      if (placementMode === "FULLY_OPEN") {
        let slotStart = new Date(windowStart);

        while (true) {
          const slotEnd = addMinutes(slotStart, consultDuration);

          if (slotStart < clampedStart) {
            slotStart = addMinutes(slotStart, consultDuration);
            continue;
          }

          if (slotEnd > clampedEnd) break;

          const isOccupied = consultations.some(
            (c) =>
              isActiveConsult(c) &&
              c.startsAt.getTime() === slotStart.getTime()
          );

          if (!isOccupied && !appointmentBlocks(slotStart, slotEnd)) {
            results.push(new Date(slotStart));
          }

          slotStart = addMinutes(slotStart, consultDuration);
        }

        continue;
      }

      if (placementMode === "OPEN_ONLY") {
        const slotStart = new Date(windowStart);
        const slotEnd = addMinutes(slotStart, consultDuration);

        if (
          slotStart >= clampedStart &&
          slotEnd <= nonConsultBoundary &&
          !appointmentBlocks(slotStart, slotEnd) &&
          !consultOccupies(slotStart, slotEnd)
        ) {
          results.push(slotStart);
        }

        continue;
      }

      if (placementMode === "CLOSE_ONLY") {
        const slotStart = addMinutes(nonConsultBoundary, -consultDuration);
        const slotEnd = addMinutes(slotStart, consultDuration);

        if (
          slotStart >= clampedStart &&
          slotEnd <= clampedEnd &&
          !appointmentBlocks(slotStart, slotEnd) &&
          !consultOccupies(slotStart, slotEnd)
        ) {
          results.push(slotStart);
        }

        continue;
      }

      if (placementMode === "OPEN_MAGNETIC") {
        for (let i = 0; i <= magneticCount; i++) {
          const slotStart = addMinutes(windowStart, i * consultDuration);
          const slotEnd = addMinutes(slotStart, consultDuration);

          if (slotStart < clampedStart || slotEnd > nonConsultBoundary) break;
          if (appointmentBlocks(slotStart, slotEnd)) break;
          if (consultOccupies(slotStart, slotEnd)) continue;

          results.push(slotStart);
        }

        continue;
      }

      if (placementMode === "CLOSE_MAGNETIC") {
        for (let i = 0; i <= magneticCount; i++) {
          const slotStart = addMinutes(nonConsultBoundary, -(i + 1) * consultDuration);
          const slotEnd = addMinutes(slotStart, consultDuration);

          if (slotStart < clampedStart || slotEnd > clampedEnd) continue;
          if (appointmentBlocks(slotStart, slotEnd)) break;
          if (consultOccupies(slotStart, slotEnd)) continue;

          results.push(slotStart);
        }

        continue;
      }
    }

    dayCursor = dayCursor.plus({ days: 1 });
  }

  return results.sort((a, b) => a - b);
}

module.exports = { computeConsultationSlots };