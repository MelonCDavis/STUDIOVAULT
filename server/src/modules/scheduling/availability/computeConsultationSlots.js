const { DateTime } = require("luxon");
const Appointment = require("../Appointment.model");
const Consultation = require("../Consultation.model");
const AvailabilityRule = require("../AvailabilityRule.model");
const ArtistProfile = require("../../artists/ArtistProfile.model");

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

  const artist = await ArtistProfile.findById(artistProfileId).lean();
  if (!artist) return [];

  const settings = artist.consultationSettings;
  if (!settings || !settings.isEnabled) return [];

  const consultDuration = settings.defaultDuration || 30;
  const placementMode = settings.placementMode || "OPEN_ONLY";
  const magneticCount = Math.max(0, settings.magneticCount || 0);

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

  // IMPORTANT:
  // CLOSE_MAGNETIC unlock depends on seeing later occupied consults in the chain.
  // POST validation may call computeConsultationSlots with a narrow `to`,
  // so we extend the upper bound by magneticCount * consultDuration (plus 1ms)
  // to include any consults at/after endDate that affect magnetic unlocking.
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

    const rulesForDay = weeklyRules.filter(r => r.DayOfWeek === jsDay);

    for (const rule of rulesForDay) {

      const tz = rule.timezone || studioTz;

      const [sh, sm] = rule.startTime.split(":").map(Number);
      const [eh, em] = rule.endTime.split(":").map(Number);

      const windowStart = dayCursor.setZone(tz).set({
        hour: sh,
        minute: sm,
        second: 0,
        millisecond: 0,
      }).toJSDate();

      const windowEnd = dayCursor.setZone(tz).set({
        hour: eh,
        minute: em,
        second: 0,
        millisecond: 0,
      }).toJSDate();

      if (!(windowStart < windowEnd)) continue;

      const clampedStart = windowStart < startDate ? startDate : windowStart;
      const clampedEnd = windowEnd > endDate ? endDate : windowEnd;

      if (!(clampedStart < clampedEnd)) continue;

      const nonConsultBoundary = appointments
        .filter(a =>
          isActiveAppointment(a, now) &&
          a.startsAt >= clampedStart &&
          a.startsAt < clampedEnd
        )
        .map(a => a.startsAt)
        .sort((a, b) => a - b)[0] || clampedEnd;

      function appointmentBlocks(slotStart, slotEnd) {
        return appointments.some(a =>
          isActiveAppointment(a, now) &&
          overlaps(slotStart, slotEnd, a.startsAt, a.endsAt)
        );
      }

      function consultOccupies(slotStart, slotEnd) {
        return consultations.some(c =>
          isActiveConsult(c) &&
          overlaps(slotStart, slotEnd, c.startsAt, addMinutes(c.startsAt, consultDuration))
        );
      }

      // OPEN_ONLY (strict anchor, no unlock)
      if (placementMode === "OPEN_ONLY") {

        const slotStart = windowStart;
        const slotEnd = addMinutes(slotStart, consultDuration);

        if (slotStart >= clampedStart && slotEnd <= clampedEnd) {

          const isOccupied = consultations.some(c =>
            isActiveConsult(c) &&
            c.startsAt.getTime() === slotStart.getTime()
          );

          // Steak blocks carrot; carrot blocks carrot
          if (!isOccupied && !appointmentBlocks(slotStart, slotEnd)) {
            results.push(new Date(slotStart));
          }
        }

        continue;
      }

      // OPEN_MAGNETIC LOGIC
      if (placementMode === "OPEN_MAGNETIC") {

        const base = windowStart;

        // Build ordered possible slot starts
        const possibleSlots = [];
        for (let i = 0; i <= magneticCount; i++) {
          possibleSlots.push(addMinutes(base, i * consultDuration));
        }

        // Determine which are occupied
        const occupied = possibleSlots.map(slotStart =>
          consultations.some(c =>
            isActiveConsult(c) &&
            c.startsAt.getTime() === slotStart.getTime()
          )
        );

        // Determine next unlockable index
        let nextIndex = 0;

        for (let i = 0; i < occupied.length; i++) {
          if (!occupied[i]) {
            nextIndex = i;
            break;
          }
          if (i === occupied.length - 1) {
            nextIndex = -1; // fully consumed
          }
        }

        if (nextIndex !== -1) {

          // All previous must be occupied
          const allPrevOccupied = occupied
            .slice(0, nextIndex)
            .every(Boolean);

          if (allPrevOccupied) {
            const slotStart = possibleSlots[nextIndex];
            const slotEnd = addMinutes(slotStart, consultDuration);

            if (
              slotStart >= clampedStart &&
              slotEnd <= nonConsultBoundary &&
              !appointmentBlocks(slotStart, slotEnd)
            ) {
              results.push(new Date(slotStart));
            }
          }
        }

        continue;
      }

      // CLOSE_ONLY (strict anchor)
      if (placementMode === "CLOSE_ONLY") {

        const baseEnd = windowEnd;
        const slotStart = addMinutes(baseEnd, -consultDuration);
        const slotEnd = baseEnd;

        if (slotStart >= clampedStart && slotEnd <= clampedEnd) {

          const isOccupied = consultations.some(c =>
            isActiveConsult(c) &&
            c.startsAt.getTime() === slotStart.getTime()
          );

          if (!isOccupied && !appointmentBlocks(slotStart, slotEnd)) {
            results.push(new Date(slotStart));
          }
        }

        continue;
      }

      // CLOSE_MAGNETIC (deterministic backward unlock)
      if (placementMode === "CLOSE_MAGNETIC") {

        const baseEnd = windowEnd;

        // Build ordered possible slot starts (backwards)
        const possibleSlots = [];
        for (let i = 0; i <= magneticCount; i++) {
          const slotEnd = addMinutes(baseEnd, -(i * consultDuration));
          const slotStart = addMinutes(slotEnd, -consultDuration);
          possibleSlots.push(slotStart);
        }

        // Determine which are occupied
        const occupied = possibleSlots.map(slotStart =>
          consultations.some(c =>
            isActiveConsult(c) &&
            c.startsAt.getTime() === slotStart.getTime()
          )
        );

        // Determine next unlockable index
        let nextIndex = 0;

        for (let i = 0; i < occupied.length; i++) {
          if (!occupied[i]) {
            nextIndex = i;
            break;
          }
          if (i === occupied.length - 1) {
            nextIndex = -1; // fully consumed
          }
        }

        if (nextIndex !== -1) {

          // All previous must be occupied
          const allPrevOccupied = occupied
            .slice(0, nextIndex)
            .every(Boolean);

          if (allPrevOccupied) {

            const slotStart = possibleSlots[nextIndex];
            const slotEnd = addMinutes(slotStart, consultDuration);

            if (
              slotStart >= clampedStart &&
              slotEnd <= clampedEnd &&
              !appointmentBlocks(slotStart, slotEnd)
            ) {
              results.push(new Date(slotStart));
            }
          }
        }

        continue;
      }
      
    }

    dayCursor = dayCursor.plus({ days: 1 });
  }

  return results.sort((a, b) => a - b);
}

module.exports = { computeConsultationSlots };