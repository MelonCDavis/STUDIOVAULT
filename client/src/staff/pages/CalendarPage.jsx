import { useState, useEffect, useRef } from "react";
import { apiGet, apiPost, apiDelete, apiPatch } from "../../services/apiClient";

function getDaysInMonth(year, month) {
    return new Date(year, month +1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

function isSameDay(a, b) {
    if (!a || !b) return false;
    return a.toDateString() === b.toDateString();
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function toUiStatus(apiStatus) {
  if (!apiStatus) return "booked";
  return String(apiStatus).toLowerCase(); // BOOKED -> booked, CHECKED_IN -> checked_in
}

function toApiStatus(uiStatus) {
  if (!uiStatus) return "BOOKED";
  return String(uiStatus).toUpperCase().trim(); // checked_in -> CHECKED_IN
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export default function CalendarPage() {
    // TEMP — replace with real context later
    const STUDIO_ID = "69936f65681b262ca3739f92";
    const ARTIST_ID = "69936f65681b262ca3739f95";
    const SERVICE_ID = "69936f65681b262ca3739f97";
    const LS_KEY = "studiovault_staff_calendar_v1";
    const today = new Date();

    function getInitialCalendarState() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return { viewMode: "month", selectedDate: null };

        const parsed = JSON.parse(raw);

        return {
          viewMode:
            parsed.viewMode === "week" || parsed.viewMode === "month"
            ? parsed.viewMode
            : "month",
          selectedDate: parsed.selectedDate
            ? new Date(parsed.selectedDate)
            : null,
        };
      } catch {
        return { viewMode: "month", selectedDate: null };
      }
    }

    const initialState = getInitialCalendarState();
    const [viewMode, setViewMode] = useState(initialState.viewMode);
    const [selectedDate, setSelectedDate] = useState(initialState.selectedDate);
    
    const [currentDate, setCurrentDate] = useState(() => {
      if (initialState.selectedDate) {
        return new Date(
          initialState.selectedDate.getFullYear(),
          initialState.selectedDate.getMonth(),
          1
        );
      }
      return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    const [bookingDraft, setBookingDraft] = useState(null);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [sidebarMode, setSidebarMode] = useState(null);

    const [focusedSlot, setFocusedSlot] = useState(null);
    const [confirmedBookings, setConfirmedBookings] = useState([]);

    useEffect(() => {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            viewMode,
            selectedDate: selectedDate ? selectedDate.toISOString() : null,
            sidebarMode,
            activeAppointmentId: bookingDraft?.id || null,
          })
        );
      } catch {}
    }, [viewMode, selectedDate, sidebarMode, bookingDraft]);

      async function fetchAppointmentsInRange(fromDate, toDate) {
        try {
            const res = await apiGet(
              `/api/staff/appointments?studioId=${STUDIO_ID}&artistProfileId=${ARTIST_ID}&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`
            );

            if (!res) {
              setConfirmedBookings([]);
              return;
            }

            const normalized = res.map((a) => ({
              id: a._id,
              start: new Date(a.startsAt),
              end: new Date(a.endsAt),
              status: a.status,
              uiStatus: toUiStatus(a.status),
              clientName: a.clientId?.legalName || "",
              phone: a.clientId?.phoneE164 || "",
              email: a.clientId?.email || "",
              service: a.serviceId?.name || "",
              notes: a.notesInternal || "",
            }));

            setConfirmedBookings(normalized);
          } catch (err) {
            console.error("Fetch appointments failed", err);
            setConfirmedBookings([]); // prevent stale state
          }
        }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthLabel = currentDate.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });

    const goPrev = () => {
      if (viewMode === "month") {
        setCurrentDate(new Date(year, month - 1, 1));
        return;
      }

      // week mode: move selectedDate by -7 days (fallback to today)
      const base = selectedDate || focusedSlot || today;
      const next = addDays(base, -7);

      setSelectedDate(next);
      setFocusedSlot(null);
      setSidebarMode((prev) => prev || "day"); // don’t aggressively close
      setCurrentDate(new Date(next.getFullYear(), next.getMonth(), 1));
    };

    const goNext = () => {
      if (viewMode === "month") {
        setCurrentDate(new Date(year, month + 1, 1));
        return;
      }

      // week mode: move selectedDate by +7 days (fallback to today)
      const base = selectedDate || focusedSlot || today;
      const next = addDays(base, 7);

      setSelectedDate(next);
      setFocusedSlot(null);
      setSidebarMode((prev) => prev || "day");
      setCurrentDate(new Date(next.getFullYear(), next.getMonth(), 1));
    };

    const handleDayClick = (dayNumber) => {
        setSelectedDate(new Date(year, month, dayNumber));
        setFocusedSlot(null);
        setBookingDraft(null);
        setSidebarMode("day");
    }

    const referenceDate = selectedDate || today;

    const startOfWeek = new Date(referenceDate);
    startOfWeek.setDate(referenceDate.getDate() - referenceDate.getDay());

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
    });

    const START_HOUR = 8;
    const END_HOUR = 24;

    const timeSlots = [];

    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      for (let minute of [0, 15, 30, 45]) {
        timeSlots.push({ hour, minute });
      }
    }


    const weekScrollRef = useRef(null);

    const handleTimeSlotClick = (dateObj, hour, minute = 0) => {
      const start = new Date(dateObj);
      start.setHours(hour, minute, 0, 0);

      const existingBooking = confirmedBookings.find((b) =>
        !["CANCELLED", "NO_SHOW"].includes(b.status) &&
        isSameDay(b.start, start) &&
        overlaps(
          start,
          new Date(start.getTime() + 15 * 60000),
          b.start,
          b.end
        )
      );

      setSidebarMode("appointment");

      if (existingBooking) {
        setFocusedSlot(existingBooking.start);
        setSelectedDate(existingBooking.start);
        setSidebarMode("appointment");

        setBookingDraft({
            id: existingBooking.id,
            start: existingBooking.start,
            hours: Math.floor((existingBooking.end - existingBooking.start) / 3600000),
            minutes: ((existingBooking.end - existingBooking.start) % 3600000) / 60000,

            clientName: existingBooking.clientName,
            phone: existingBooking.phone,
            email: existingBooking.email,
            service: existingBooking.service,
            notes: existingBooking.notes,

            status: toUiStatus(existingBooking.status), // <-- lower UI value
            isAdult: true,
            dateOfBirth: "",
          });

          return;
        }

        // empty slot → new draft
        setFocusedSlot(start);
        setSelectedDate(start);
        setSidebarMode("appointment");

        setBookingDraft({
          start,
          hours: 1,
          minutes: 0,
          clientName: "",
          phone: "",
          email: "",
          service: "",
          notes: "",
          status: "booked",
          isAdult: true,
          dateOfBirth: "",
        });
    };

    const activeDate = focusedSlot || selectedDate;

    useEffect(() => {
        if (viewMode === "week" && weekScrollRef.current) {
          const slotHeight = 16 * 4; 
          const defaultHour = 12;
          const scrollTo = (defaultHour - START_HOUR) * slotHeight;

          weekScrollRef.current.scrollTop = scrollTo;
        }
    }, [viewMode]);

    const dayBookings = activeDate
      ? confirmedBookings
        .filter((b) => isSameDay(b.start, activeDate))
        .filter((b) => !["CANCELLED", "NO_SHOW"].includes(b.status))
        .sort((a, b) => a.start - b.start)
      : [];

      useEffect(() => {
        const rangeStart = new Date(year, month, 1, 0, 0, 0, 0);
        const rangeEnd = new Date(year, month + 1, 0, 23, 59 ,59, 999);

        fetchAppointmentsInRange(rangeStart, rangeEnd);
      }, [year, month]);

      useEffect(() => {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw);
            if (!parsed.activeAppointmentId) return;

            const match = confirmedBookings.find(
              (b) => b.id === parsed.activeAppointmentId
            );

            if (!match) return;

            setSidebarMode("appointment");
            setFocusedSlot(match.start);
            setSelectedDate(match.start);

            setBookingDraft({
              id: match.id,
              start: match.start,
              hours: Math.floor((match.end - match.start) / 3600000),
              minutes:
                ((match.end - match.start) % 3600000) / 60000,
              clientName: match.clientName,
              phone: match.phone,
              email: match.email,
              service: match.service,
              notes: match.notes,
              status: toUiStatus(match.status),
              isAdult: true,
              dateOfBirth: "",
            });
          } catch {}
        }, [confirmedBookings]);

    return (
        <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={goPrev}
                className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700"
              >
                Prev
              </button>

              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{monthLabel}</h2>

                <button
                  onClick={() =>
                    setViewMode(viewMode === "month" ? "week" : "month")
                  }
                  className="text-xs px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
                >
                  {viewMode === "month" ? "Week View" : "Month View"}
                </button>
              </div>

              <button
                onClick={goNext}
                className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700"
              >
                Next
              </button>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 text-xs text-neutral-400 uppercase tracking-wide">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center py-2">
                    {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */} 
            {viewMode === "month" ? (
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNumber = i + 1;

                  const isToday =
                    dayNumber === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear();

                  const isSelected =
                    selectedDate &&
                    dayNumber === selectedDate.getDate() &&
                    month === selectedDate.getMonth() &&
                    year === selectedDate.getFullYear();

                  return (
                    <div
                      key={i}
                      onClick={() => handleDayClick(dayNumber)}
                      className={`
                        aspect-square
                        rounded
                        border
                        border-neutral-800
                        p-2
                        text-sm
                        flex
                        flex-col
                        justify-between
                        cursor-pointer
                        transition
                        ${
                          isSelected
                            ? "bg-neutral-700"
                            : isToday
                            ? "bg-neutral-800"
                            : "bg-neutral-900 hover:bg-neutral-800"
                        }
                      `}
                    >
                      <div className="text-sm font-medium">
                        {dayNumber}
                      </div>
                      <div className="flex gap-1 flex-wrap"></div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">

                {weekDays.map((dateObj, i) => {
                  const isToday =
                    dateObj.toDateString() === today.toDateString();

                  const isSelected =
                    selectedDate &&
                    dateObj.toDateString() === selectedDate.toDateString();

                  return (
                    <div
                      key={i}
                      className={`
                        rounded
                        border
                        border-neutral-800
                        bg-neutral-900
                        flex
                        flex-col
                        ${
                        isSelected
                            ? "ring-2 ring-neutral-600"
                            : ""
                        }
                      `}
                    >
                      {/* Day Header */}
                      <div
                        onClick={() => {
                          setSelectedDate(dateObj);
                          setFocusedSlot(null);
                          setBookingDraft(null);
                          setSidebarMode("day");
                        }}
                          className={`
                          p-2
                          text-sm
                          font-medium
                          border-b
                          border-neutral-800
                          cursor-pointer
                          ${
                            isToday
                            ? "bg-neutral-800"
                            : ""
                          }
                        `}
                      >
                        {dateObj.toLocaleDateString("default", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>

                      {/* Time Slots */}
                      <div 
                        ref={weekScrollRef}
                        className="flex-1 overflow-y-auto divide-y divide-neutral-800">
                        {timeSlots.map(({ hour, minute }) => {
                          const slotStart = new Date(dateObj);
                          slotStart.setHours(hour, minute, 0, 0);

                          const slotEnd = new Date(slotStart.getTime() + 15 * 60000);

                          const isSelected =
                            focusedSlot &&
                            focusedSlot.getHours() === hour &&
                            focusedSlot.getMinutes() === minute &&
                            dateObj.toDateString() === focusedSlot.toDateString();

                          const bookingInSlot = confirmedBookings.find((b) =>
                            !["CANCELLED", "NO_SHOW"].includes(b.status) &&
                            isSameDay(b.start, slotStart) &&
                            overlaps(slotStart, slotEnd, b.start, b.end)
                          );

                          return (
                            <div
                              key={`${hour}-${minute}`}
                              onClick={() => handleTimeSlotClick(dateObj, hour, minute)}
                              className={`
                                h-4
                                px-2
                                text-[10px]
                                flex
                                items-center
                                cursor-pointer
                                transition
                                ${
                                isSelected
                                    ? "bg-neutral-700 text-neutral-200"
                                    : "text-neutral-500 hover:bg-neutral-800"
                                }
                              `}
                            >
                            <div className="flex justify-between w-full">
                                <span
                                  className={
                                    minute === 0
                                      ? "text-[10px] text-neutral-400"
                                      : "text-[9px] text-neutral-600 pl-4"
                                  }
                                >
                                  {minute === 0
                                    ? `${hour}:00`
                                    : `${minute}`}
                                </span>

                                {bookingInSlot && (
                                  <span className="text-[9px] px-1 rounded bg-neutral-800 text-neutral-200">
                                    {bookingInSlot.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            {/* Selected Day Panel */}
            {activeDate && (
              <div className="border border-neutral-800 rounded bg-neutral-900 p-4 space-y-4">
                <h3 className="text-sm text-neutral-400 uppercase tracking-wide">
                  Selected Date
                </h3>
                <div className="text-lg font-semibold">
                 {activeDate.toLocaleDateString("default", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    })}
                </div>
                {sidebarMode === "day" && (
                  <div className="border-t border-neutral-800 pt-4 space-y-2">
                    {dayBookings.length === 0 ? (
                        <div className="text-sm text-neutral-400">No bookings yet.</div>
                    ) : (
                        dayBookings.map((b) => (
                        <div
                            key={b.id}
                            className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2"
                        >
                            <div className="text-xs text-neutral-400">
                            {b.start.getHours()}:
                            {b.start.getMinutes().toString().padStart(2, "0")}
                            {" – "}
                            {b.end.getHours()}:
                            {b.end.getMinutes().toString().padStart(2, "0")}
                            </div>
                            <div className="rounded border border-neutral-800 bg-neutral-950 px-3 py-3 space-y-2">
                            
                            <div className="text-sm text-neutral-200 font-semibold">
                                {b.service || "Appointment"}
                            </div>

                            <div className="text-xs text-neutral-400 capitalize">
                                Status: {b.status || "booked"}
                            </div>

                            {b.clientName && (
                                <div className="text-xs text-neutral-300">
                                Client: {b.clientName}
                                </div>
                            )}

                            {b.phone && (
                                <div className="text-xs text-neutral-400">
                                Phone: {b.phone}
                                </div>
                            )}

                            {b.email && (
                                <div className="text-xs text-neutral-400">
                                Email: {b.email}
                                </div>
                            )}

                            {b.notes && (
                                <div className="text-xs text-neutral-500 pt-1 border-t border-neutral-800">
                                {b.notes}
                                </div>
                            )}

                            <button
                                onClick={() => {
                                setSidebarMode("appointment");
                                setFocusedSlot(b.start);
                                setSelectedDate(b.start);

                                setBookingDraft({
                                    id: b.id,
                                    start: b.start,
                                    hours: Math.floor((b.end - b.start) / 3600000),
                                    minutes:
                                    ((b.end - b.start) % 3600000) / 60000,
                                    clientName: b.clientName,
                                    phone: b.phone,
                                    email: b.email,
                                    service: b.service,
                                    notes: b.notes,
                                    isAdult: true,
                                    dateOfBirth: "",
                                    status: toUiStatus(b.status),
                                });
                                }}
                                className="mt-2 text-xs px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
                            >
                                Edit
                            </button>
                            {deleteTargetId === b.id ? (
                                <div className="mt-2 flex gap-2 items-center">
                                    <span className="text-xs text-red-400">Confirm delete?</span>

                                    <button
                                    onClick={async () => {
                                        try {
                                            await apiDelete(`/api/staff/appointments/${b.id}`);

                                            const rangeStart = new Date(year, month, 1, 0, 0, 0, 0);
                                            const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

                                            await fetchAppointmentsInRange(rangeStart, rangeEnd);

                                            setDeleteTargetId(null);
                                        } catch (err) {
                                            console.error("Delete failed", err);
                                        }
                                    }}
                                    className="text-xs px-2 py-1 rounded bg-red-900 text-red-300 hover:bg-red-800"
                                    >
                                    Yes
                                    </button>

                                    <button
                                    onClick={() => setDeleteTargetId(null)}
                                    className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
                                    >
                                    Cancel
                                    </button>
                                </div>
                                ) : (
                                <button
                                    onClick={() => setDeleteTargetId(b.id)}
                                    className="mt-2 text-xs px-3 py-1 rounded bg-red-900 text-red-300 hover:bg-red-800"
                                >
                                    Delete
                                </button>
                                )}
                            </div>
                        </div>
                        ))
                    )}
                  </div>
                )}
                {sidebarMode === "appointment" && bookingDraft && isSameDay(bookingDraft.start, activeDate) && (
                  <div className="pt-4 border-t border-neutral-800 space-y-4 transition-opacity duration-150">

                    <div className="text-sm text-neutral-400">
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                setSidebarMode("day");
                                setBookingDraft(null);
                                setFocusedSlot(null);
                                }}
                                className="text-xs px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
                            >
                                Back to day
                            </button>
                        </div>
                      {bookingDraft.start.getHours()}:
                      {bookingDraft.start.getMinutes().toString().padStart(2, "0")} selected
                    </div>

                    {/* Duration Selectors */}
                    <div className="flex gap-4">
                      <div className="flex flex-col">
                        <label className="text-xs text-neutral-400 mb-1">Hours</label>
                        <select
                          value={bookingDraft.hours}
                          onChange={(e) =>
                            setBookingDraft((prev) => ({
                              ...prev,
                              hours: parseInt(e.target.value, 10),
                            }))
                          }
                          className="bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                       >
                          {Array.from({ length: 13 }).map((_, i) => (
                            <option key={i} value={i}>
                              {i}
                            </option>
                          ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs text-neutral-400 mb-1">Minutes</label>
                        <select
                          value={bookingDraft.minutes}
                          onChange={(e) =>
                            setBookingDraft((prev) => ({
                              ...prev,
                              minutes: parseInt(e.target.value, 10),
                            }))
                          }
                          className="bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                        >
                          {[0, 15, 30, 45].map((m) => (
                            <option key={m} value={m}>
                              {m.toString().padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Client Info */}
                    <input
                      placeholder="Client Name"
                      value={bookingDraft.clientName}
                      onChange={(e) =>
                        setBookingDraft((prev) => ({
                          ...prev,
                          clientName: e.target.value,
                        }))
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                    />

                    <input
                      placeholder="Phone"
                      value={bookingDraft.phone}
                      onChange={(e) =>
                        setBookingDraft((prev) => ({
                         ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                    />

                    <input
                      placeholder="Email"
                      value={bookingDraft.email}
                      onChange={(e) =>
                        setBookingDraft((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                    />

                    <textarea
                      placeholder="Service Description"
                      value={bookingDraft.service}
                      onChange={(e) =>
                        setBookingDraft((prev) => ({
                          ...prev,
                          service: e.target.value,
                        }))
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 text-xs p-2 rounded resize-none"
                      rows={4}
                    />

                    <div className="flex gap-4 items-center">
                      <label className="text-xs text-neutral-400">
                        Over 18?
                      </label>

                      <select
                        value={bookingDraft.isAdult ? "yes" : "no"}
                        onChange={(e) =>
                          setBookingDraft((prev) => ({
                            ...prev,
                            isAdult: e.target.value === "yes",
                          }))
                        }
                        className="bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    {!bookingDraft.isAdult && (
                      <input
                        type="date"
                        value={bookingDraft.dateOfBirth}
                        onChange={(e) =>
                          setBookingDraft((prev) => ({
                            ...prev,
                            dateOfBirth: e.target.value,
                          }))
                        }
                        className="w-full bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                      />
                    )}

                    <textarea
                      placeholder="Notes"
                      value={bookingDraft.notes}
                      onChange={(e) =>
                        setBookingDraft((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                      rows={3}
                    />

                    {/* Status Selector */}
                    <div className="flex gap-3 items-center">
                      <label className="text-xs text-neutral-400">Status</label>
                      <select
                        value={bookingDraft.status}
                        onChange={(e) =>
                          setBookingDraft((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                        className="bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                    >
                        <option value="held">Held</option>
                        <option value="booked">Booked</option>
                        <option value="checked_in">Checked In</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </div>

                    {(() => {
                      const start = bookingDraft.start;
                      const durationMs =
                        bookingDraft.hours * 60 * 60000 +
                        bookingDraft.minutes * 60000;

                      const end = new Date(start.getTime() + durationMs);

                      const hasConflict = confirmedBookings.some((b) =>
                        b.id !== bookingDraft.id &&
                        isSameDay(b.start, start) &&
                        overlaps(start, end, b.start, b.end)
                      );
                      
                      const needsNote =
                        bookingDraft.status === "cancelled" || bookingDraft.status === "no_show";

                      const hasNote = (bookingDraft.notes || "").trim().length > 0;

                    return hasConflict ? (
                        <div className="text-sm text-red-400">
                          This time range conflicts with an existing booking.
                        </div>
                    ) : (
                        <button
                          onClick={async () => {
                            const durationMs =
                                bookingDraft.hours * 60 * 60000 +
                                bookingDraft.minutes * 60000;

                            const end = new Date(
                                bookingDraft.start.getTime() + durationMs
                            );

                            const payload = {
                                studioId: STUDIO_ID,
                                artistProfileId: ARTIST_ID,
                                serviceId: SERVICE_ID,
                                startsAt: bookingDraft.start.toISOString(),
                                endsAt: end.toISOString(),
                                status: toApiStatus(bookingDraft.status),
                                notesInternal: bookingDraft.notes,
                            };

                            // If no selected clientId, send inline data
                            if (!bookingDraft.selectedClientId) {
                                payload.clientName = bookingDraft.clientName;
                                payload.phone = bookingDraft.phone;
                                payload.email = bookingDraft.email;
                                payload.isAdult = bookingDraft.isAdult;

                                if (!bookingDraft.isAdult) {
                                    payload.dateOfBirth = bookingDraft.dateOfBirth;
                                }
                            } else {
                                payload.clientId = bookingDraft.selectedClientId;
                            }

                            try {
                                let saved;

                                if (bookingDraft.id) {
                                  saved = await apiPatch(`/api/staff/appointments/${bookingDraft.id}`, payload);
                                } else {
                                  saved = await apiPost("/api/staff/appointments", payload);
                                }

                                const rangeStart = new Date(year, month, 1, 0, 0, 0, 0);
                                const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

                                await fetchAppointmentsInRange(rangeStart, rangeEnd);

                                if (!bookingDraft.id && saved?._id) {
                                  setBookingDraft((prev) => ({
                                    ...prev,
                                    id: saved._id,
                                  }));
                                }

                                  // Determine if we should close the panel
                                  const isCompleted = bookingDraft.status === "completed";
                                  const isCancelled = bookingDraft.status === "cancelled";
                                  const isNoShow = bookingDraft.status === "no_show";

                                  // Prompt if completed without notes
                                  if (isCompleted && !bookingDraft.notes?.trim()) {
                                    const proceed = window.confirm(
                                      "No session notes entered. Complete without notes?"
                                    );
                                    if (!proceed) return;
                                  }

                                  // Close only for completed / cancelled / no_show
                                  if (isCompleted || isCancelled || isNoShow) {
                                    setSidebarMode("day");
                                    setBookingDraft(null);
                                    setFocusedSlot(null);
                                  }
                            } catch (err) {
                                console.error(err);
                                alert("Booking failed");
                            }
                          }}
                          disabled={needsNote && !hasNote}
                          className={`w-full px-3 py-2 text-xs rounded bg-neutral-700 hover:bg-neutral-600 ${
                            needsNote && !hasNote ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          Confirm Booking
                        </button>
                      );
                    })()}
                    {bookingDraft.id && (
                      <button
                        onClick={async () => {
                          const ok = window.confirm("Delete this appointment? This will mark it as CANCELLED.");
                          if (!ok) return;

                          try {
                            await apiDelete(`/api/staff/appointments/${bookingDraft.id}`);

                            const rangeStart = new Date(year, month, 1, 0, 0, 0, 0);
                            const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
                            await fetchAppointmentsInRange(rangeStart, rangeEnd);

                            setSidebarMode("day");
                            setBookingDraft(null);
                            setFocusedSlot(null);
                          } catch (err) {
                            console.error(err);
                            alert("Delete failed");
                          }
                        }}
                        className="w-full px-3 py-2 text-xs rounded bg-red-900 text-red-200 hover:bg-red-800"
                      >
                        Delete appointment
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>
    );
}