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
  durationMinutes = 60, //default
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
  const now = new Date();

  const appointments = await Appointment.find({
    artistProfileId,
    studioId,
    startsAt: { $lt: endDate },
    endsAt: { $gt: startDate },
    $or: [
      { status: { $in: ["BOOKED", "CHECKED_IN", "COMPLETED"] } },
      {
        status: "HELD",
        holdExpiresAt: { $gt: now },
      },
    ],
  }).lean();

  const day = new Date(startDate);
  day.setHours(0, 0, 0, 0);

  while (day < endDate) {
    const dayOfWeek = day.getDay();

    // Get ALL rules for this day
const rulesForDay = weeklyRules.filter(r => r.DayOfWeek === dayOfWeek);

if (!rulesForDay.length) {
  day.setDate(day.getDate() + 1);
  continue;
}

const STEP_MINUTES = 15;

for (const rule of rulesForDay) {
  const [startHour, startMinute] = rule.startTime.split(":").map(Number);
  const [endHour, endMinute] = rule.endTime.split(":").map(Number);

  const windowStart = new Date(day);
  windowStart.setHours(startHour, startMinute, 0, 0);

  const windowEnd = new Date(day);
  windowEnd.setHours(endHour, endMinute, 0, 0);

  let slotStart = new Date(windowStart);

  while (addMinutes(slotStart, durationMinutes) <= windowEnd) {
    const slotEnd = addMinutes(slotStart, durationMinutes);

    if (
      slotStart < startDate ||
      slotStart >= endDate ||
      slotEnd > endDate
    ) {
      slotStart = addMinutes(slotStart, STEP_MINUTES);
      continue;
    }

    const conflict = appointments.some(appt =>
      overlaps(slotStart, slotEnd, appt.startsAt, appt.endsAt)
    );

    if (!conflict) {
      results.push(new Date(slotStart));
    }

    slotStart = addMinutes(slotStart, STEP_MINUTES);
  }
}



    day.setDate(day.getDate() + 1);
  }
  results.sort((a, b) => a - b);

  return results;
}

module.exports = { computeHourlySlots };
