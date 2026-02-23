const Appointment = require("../Appointment.model");
const AvailabilityRule = require("../AvailabilityRule.model");

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function computeHourlySlots({
  artistProfileId,
  studioId,
  from,
  to,
}) {
  const results = [];

  const startDate = new Date(from);
  const endDate = new Date(to);

  // Fetch weekly rules once
  const weeklyRules = await AvailabilityRule.find({
    artistProfileId,
    studioId,
    type: "WEEKLY",
    isActive: true,
  }).lean();

  if (!weeklyRules.length) return [];

  // Fetch appointments in range once
  const appointments = await Appointment.find({
    artistProfileId,
    studioId,
    startsAt: { $lt: endDate },
    endsAt: { $gt: startDate },
    status: { $in: ["BOOKED", "CHECKED_IN", "COMPLETED", "HELD"] },
  }).lean();

  const day = new Date(startDate);

  while (day < endDate) {
    const dayOfWeek = day.getDay();

    const rule = weeklyRules.find(r => r.DayOfWeek === dayOfWeek);
    if (!rule) {
      day.setDate(day.getDate() + 1);
      continue;
    }

    const [startHour, startMinute] = rule.startTime.split(":").map(Number);
    const [endHour, endMinute] = rule.endTime.split(":").map(Number);

    const windowStart = new Date(day);
    windowStart.setHours(startHour, startMinute, 0, 0);

    const windowEnd = new Date(day);
    windowEnd.setHours(endHour, endMinute, 0, 0);

    let slotStart = new Date(windowStart);

    while (addMinutes(slotStart, 60) <= windowEnd) {
      const slotEnd = addMinutes(slotStart, 60);

      const conflict = appointments.some(appt =>
        overlaps(slotStart, slotEnd, appt.startsAt, appt.endsAt)
      );

      if (!conflict) {
        results.push(new Date(slotStart));
      }

      slotStart = addMinutes(slotStart, 60);
    }

    day.setDate(day.getDate() + 1);
  }

  return results;
}

module.exports = { computeHourlySlots };
