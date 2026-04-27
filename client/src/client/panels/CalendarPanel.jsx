import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../services/apiClient";

const SERVICE_ID = "REPLACE_WITH_SERVICE_ID"; // temp until service selection is wired
// Selected through public search or direct booking links.

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatDateTime(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("default", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CalendarPanel({ evaluationAppointmentId }) {
  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);

  const [inviteSlots, setInviteSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");

  const today = new Date();

  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [viewMode, setViewMode] = useState("month");
  const [consultationSlots, setConsultationSlots] = useState([]);
  const [isLoadingConsultationSlots, setIsLoadingConsultationSlots] = useState(false);
  const [consultationSlotError, setConsultationSlotError] = useState("");
  const [consultationDescription, setConsultationDescription] = useState("");
  const [consultationPlacement, setConsultationPlacement] = useState("");
  const [consultationBudget, setConsultationBudget] = useState("");
  const [consultationTimeframe, setConsultationTimeframe] = useState("");
  const [consultationNotes, setConsultationNotes] = useState("");
  const [consultationImageRefs, setConsultationImageRefs] = useState([]);
  const [isRequestingConsultation, setIsRequestingConsultation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ studios: [], artists: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isLoadingDirectTarget, setIsLoadingDirectTarget] = useState(false);
  const [directTargetError, setDirectTargetError] = useState("");
  const [selectedBookingTarget, setSelectedBookingTarget] = useState(null);
  // shape:
  // {
  //   type: "artist",
  //   artistId,
  //   studioId,
  //   label,
  //   sublabel
  // }

  const [currentMonthDate, setCurrentMonthDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const selectedStudioId = selectedBookingTarget?.studioId || "";
  const selectedArtistId = selectedBookingTarget?.artistId || "";
  const hasConsultationTarget = Boolean(selectedStudioId && selectedArtistId);

  const directStudioId = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("studio") || "";
    } catch {
      return "";
    }
  }, []);

  const directArtistId = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("artist") || "";
    } catch {
      return "";
    }
  }, []);

  const inviteToken = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("invite") || "";
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadDirectBookingTarget() {
      if (inviteToken) return;
      if (!directStudioId || !directArtistId) return;
      if (selectedBookingTarget) return;

      try {
        setIsLoadingDirectTarget(true);
        setDirectTargetError("");

        const data = await apiGet(
          `/api/public/booking-target?studioId=${directStudioId}&artistId=${directArtistId}`
        );

        if (ignore) return;

        setSelectedBookingTarget({
          type: "artist",
          artistId: data.artistId,
          studioId: data.studioId,
          label: data.label || "Selected artist",
          sublabel: data.sublabel || "Loaded from booking link",
        });
      } catch (err) {
        if (ignore) return;
        console.error("Load direct booking target failed", err);
        setDirectTargetError(
          err?.response?.error || "Could not load booking link details."
        );
      } finally {
        if (!ignore) {
          setIsLoadingDirectTarget(false);
        }
      }
    }

    loadDirectBookingTarget();

    return () => {
      ignore = true;
    };
  }, [inviteToken, directStudioId, directArtistId, selectedBookingTarget]);

  const slotsByDay = useMemo(() => {
    const grouped = {};

    const sourceSlots = inviteToken ? inviteSlots : consultationSlots;

    sourceSlots.forEach((slotIso) => {
      const d = new Date(slotIso);
      if (Number.isNaN(d.getTime())) return;

      const dayKey = d.toISOString().slice(0, 10);
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(slotIso);
    });

    Object.values(grouped).forEach((arr) => {
      arr.sort((a, b) => new Date(a) - new Date(b));
    });

    return grouped;
  }, [inviteSlots, consultationSlots, inviteToken]);

  const availableDays = useMemo(() => {
    return Object.keys(slotsByDay).sort();
  }, [slotsByDay]);

  const monthYear = currentMonthDate.toLocaleDateString("default", {
    month: "long",
    year: "numeric",
  });

  const currentYear = currentMonthDate.getFullYear();
  const currentMonth = currentMonthDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);

  function goPrevMonth() {
    setCurrentMonthDate(new Date(currentYear, currentMonth - 1, 1));
  }

  function goNextMonth() {
    setCurrentMonthDate(new Date(currentYear, currentMonth + 1, 1));
  }

  function goPrevWeek() {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);

    const prevDayKey = prev.toISOString().slice(0, 10);
    setSelectedDay(prevDayKey);
    setSelectedSlot("");
  }

  function goNextWeek() {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);

    const nextDayKey = next.toISOString().slice(0, 10);
    setSelectedDay(nextDayKey);
    setSelectedSlot("");
  }

  function isAvailableDay(dayNumber) {
    const dayDate = new Date(currentYear, currentMonth, dayNumber);
    const dayKey = dayDate.toISOString().slice(0, 10);
    return availableDays.includes(dayKey);
  }

  function getDayKey(dayNumber) {
    const dayDate = new Date(currentYear, currentMonth, dayNumber);
    return dayDate.toISOString().slice(0, 10);
  }

  function getStartOfWeek(dateValue) {
    const d = new Date(dateValue);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  const selectedDayDate = selectedDay ? new Date(`${selectedDay}T00:00:00`) : today;
  const weekStart = getStartOfWeek(selectedDayDate);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const weekSlotsByDay = weekDays.map((dayDate) => {
    const dayKey = dayDate.toISOString().slice(0, 10);
    return {
      dayKey,
      date: dayDate,
      slots: slotsByDay[dayKey] || [],
    };
  });

  useEffect(() => {
    let ignore = false;

    async function loadInvite() {
      if (!inviteToken) {
        setInvite(null);
        setInviteError("");
        return;
      }

      try {
        setIsLoadingInvite(true);
        setInviteError("");

        const data = await apiGet(`/api/appointment-invites/${inviteToken}`);

        if (ignore) return;

        setInvite(data || null);
      } catch (err) {
        if (ignore) return;
        console.error("Load appointment invite failed", err);
        setInvite(null);
        setInviteError(err?.response?.error || "Failed to load booking invite");
      } finally {
        if (!ignore) {
          setIsLoadingInvite(false);
        }
      }
    }

    loadInvite();

    return () => {
      ignore = true;
    };
  }, [inviteToken]);

  useEffect(() => {
    let ignore = false;

    async function loadInviteSlots() {
      if (!inviteToken || !invite || invite.status !== "ACTIVE") {
        setInviteSlots([]);
        setSlotError("");
        setSelectedDay("");
        setSelectedSlot("");
        return;
      }

      try {
        setIsLoadingSlots(true);
        setSlotError("");

        const data = await apiGet(`/api/appointment-invites/${inviteToken}/slots`);

        if (ignore) return;

        const nextSlots = Array.isArray(data?.slots) ? data.slots : [];
        setInviteSlots(nextSlots);

        const firstDay = nextSlots.length ? nextSlots[0].slice(0, 10) : "";
        setSelectedDay(firstDay);
        setSelectedSlot("");

        if (firstDay) {
          const firstDate = new Date(`${firstDay}T00:00:00`);
          setCurrentMonthDate(
            new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
          );
        }
      } catch (err) {
        if (ignore) return;
        console.error("Load invite slots failed", err);
        setInviteSlots([]);
        setSelectedDay("");
        setSelectedSlot("");
        setSlotError(err?.response?.error || "Failed to load available slots");
      } finally {
        if (!ignore) {
          setIsLoadingSlots(false);
        }
      }
    }

    loadInviteSlots();

    return () => {
      ignore = true;
    };
    }, [inviteToken, invite]);

    useEffect(() => {
      let ignore = false;

      async function loadConsultationSlots() {
        if (inviteToken || !hasConsultationTarget) {
          setConsultationSlots([]);
          setSelectedDay("");
          setSelectedSlot("");
          return;
        }

        try {
          setIsLoadingConsultationSlots(true);
          setConsultationSlotError("");

          const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
          const from = monthStart < now ? now : monthStart;
          const to = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

          const data = await apiGet(
            `/api/client/consultations/availability?studioId=${selectedStudioId}&artistProfileId=${selectedArtistId}&from=${from.toISOString()}&to=${to.toISOString()}`
          );

          if (ignore) return;

          const now = new Date();

          const nextSlots = Array.isArray(data?.slots)
            ? data.slots.filter((slotIso) => {
                const slotDate = new Date(slotIso);
                return !Number.isNaN(slotDate.getTime()) && slotDate > now;
              })
            : [];

          setConsultationSlots(nextSlots);

          if (!selectedDay && nextSlots.length) {
            setSelectedDay(nextSlots[0].slice(0, 10));
          }
        } catch (err) {
          if (ignore) return;
          console.error("Load consultation slots failed", err);
          setConsultationSlots([]);
          setConsultationSlotError(
            err?.response?.error || "Failed to load consultation availability"
          );
        } finally {
          if (!ignore) {
            setIsLoadingConsultationSlots(false);
          }
        }
      }

    loadConsultationSlots();

    return () => {
      ignore = true;
    };
  }, [
      inviteToken,
      hasConsultationTarget,
      selectedStudioId,
      selectedArtistId,
      currentYear,
      currentMonth,
      selectedDay,
    ]);

  async function handleBookAppointment() {
    if (!selectedSlot) {
      alert("Select a valid appointment time.");
      return;
    }

    try {
      setIsBooking(true);

      await apiPost(`/api/appointment-invites/${inviteToken}/book`, {
        startsAt: selectedSlot,
        serviceId: SERVICE_ID,
      });

      alert("Appointment confirmed.");

      setInvite((prev) => (prev ? { ...prev, status: "USED" } : prev));
      setInviteSlots([]);
      setSelectedDay("");
      setSelectedSlot("");
    } catch (err) {
      console.error("Book appointment failed", err);
      alert(err?.response?.error || "Failed to confirm appointment");
    } finally {
      setIsBooking(false);
    }
  }

  async function handleSearchBookingTargets(e) {
    e.preventDefault();

    const q = searchQuery.trim();

    if (q.length < 2) {
      setSearchError("Enter at least 2 characters.");
      return;
    }

    try {
      setIsSearching(true);
      setSearchError("");

      const data = await apiGet(`/api/public/search?q=${encodeURIComponent(q)}`);

      setSearchResults({
        studios: Array.isArray(data?.studios) ? data.studios : [],
        artists: Array.isArray(data?.artists) ? data.artists : [],
      });
    } catch (err) {
      console.error("Search booking targets failed", err);
      setSearchResults({ studios: [], artists: [] });
      setSearchError(err?.response?.error || "Search failed.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleRequestConsultation() {
    if (!hasConsultationTarget) {
      alert("Choose an artist or studio first.");
      return;
    }

    if (!selectedSlot) {
      alert("Select a consultation time.");
      return;
    }

    if (!consultationDescription.trim()) {
      alert("Add a project description before submitting.");
      return;
    }

    try {
      setIsRequestingConsultation(true);

      await apiPost("/api/client/consultations/request", {
        studioId: selectedStudioId,
        artistProfileId: selectedArtistId,
        startsAt: selectedSlot,
        description: consultationDescription,
        preferredDate: consultationTimeframe,
        travelInfo: consultationNotes,
        budget: consultationBudget,
        imageRefs: consultationImageRefs,
      });

      alert("Consultation request submitted.");

      setSelectedSlot("");
      setConsultationDescription("");
      setConsultationPlacement("");
      setConsultationBudget("");
      setConsultationTimeframe("");
      setConsultationNotes("");
      setConsultationImageRefs([]);
    } catch (err) {
      console.error("Request consultation failed", err);
      alert(err?.response?.error || "Failed to request consultation");
    } finally {
      setIsRequestingConsultation(false);
    }
  }

  function resetConsultationSelection() {
    setSelectedBookingTarget(null);
    setConsultationSlots([]);
    setSelectedDay("");
    setSelectedSlot("");
    setConsultationDescription("");
    setConsultationPlacement("");
    setConsultationBudget("");
    setConsultationTimeframe("");
    setConsultationNotes("");
    setConsultationImageRefs([]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Calendar</h2>

        {evaluationAppointmentId ? (
          <p className="text-sm text-amber-400">
            Evaluating appointment block: {evaluationAppointmentId}
          </p>
        ) : (
          <p className="text-sm text-neutral-400">
            Calendar view.
          </p>
        )}
      </div>

      {inviteToken ? (
        <div className="rounded-2xl border border-blue-900/60 bg-blue-950/30 p-4 space-y-3">
          <div className="text-sm font-medium text-blue-100">
            Appointment Booking Invite
          </div>

          {isLoadingInvite ? (
            <div className="text-sm text-blue-200/80">
              Loading your booking invite...
            </div>
          ) : inviteError ? (
            <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
              {inviteError}
            </div>
          ) : !invite ? (
            <div className="text-sm text-blue-200/80">
              Invite not found.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-blue-100">
                Your artist has invited you to choose an appointment time.
              </div>

              <div className="grid gap-2 text-sm">
                <div className="text-blue-200/90">
                  <span className="text-blue-300/70">Status:</span>{" "}
                  {invite.status || "ACTIVE"}
                </div>
                <div className="text-blue-200/90">
                  <span className="text-blue-300/70">Duration:</span>{" "}
                  {invite.durationMinutes || 0} minutes
                </div>
                <div className="text-blue-200/90">
                  <span className="text-blue-300/70">Placement mode:</span>{" "}
                  {invite.placementMode || "OPEN_MAGNETIC"}
                </div>
                <div className="text-blue-200/90">
                  <span className="text-blue-300/70">Valid from:</span>{" "}
                  {formatDateTime(invite.validFrom)}
                </div>
                <div className="text-blue-200/90">
                  <span className="text-blue-300/70">Valid until:</span>{" "}
                  {formatDateTime(invite.validUntil)}
                </div>
              </div>

              {invite.messageToClient ? (
                <div className="rounded-xl border border-blue-900/60 bg-black/20 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-blue-300/70">
                    Artist message
                  </div>
                  <div className="mt-1 text-sm text-blue-100 whitespace-pre-wrap">
                    {invite.messageToClient}
                  </div>
                </div>
              ) : null}

              {hasConsultationTarget && (
                <div className="rounded-xl border border-amber-900/60 bg-amber-950/40 p-3">                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-neutral-300">
                    Choose from the valid appointment times below.
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("month")}
                      className={`rounded px-3 py-2 text-xs ${
                        viewMode === "month"
                          ? "bg-neutral-700 text-neutral-100"
                          : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                      }`}
                    >
                      Month
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode("week")}
                      className={`rounded px-3 py-2 text-xs ${
                        viewMode === "week"
                          ? "bg-neutral-700 text-neutral-100"
                          : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                      }`}
                    >
                      Week
                    </button>
                  </div>
                </div>

                {isLoadingSlots ? (
                  <div className="text-sm text-neutral-400">
                    Loading available slots...
                  </div>
                ) : slotError ? (
                  <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
                    {slotError}
                  </div>
                ) : availableDays.length === 0 ? (
                  <div className="text-sm text-neutral-400">
                    No valid appointment times are currently available for this invite.
                  </div>
                ) : (
                  <>
                    {viewMode === "month" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={goPrevMonth}
                            className="rounded bg-neutral-900 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
                          >
                            Prev
                          </button>

                          <div className="text-sm font-medium text-neutral-200">
                            {monthYear}
                          </div>

                          <button
                            type="button"
                            onClick={goNextMonth}
                            className="rounded bg-neutral-900 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
                          >
                            Next
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-2 text-[10px] uppercase tracking-wide text-neutral-500">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="text-center py-1">
                              {day}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} />
                          ))}

                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNumber = i + 1;
                            const dayKey = getDayKey(dayNumber);
                            const isAvailable = isAvailableDay(dayNumber);
                            const isSelected = selectedDay === dayKey;

                            return (
                              <button
                                key={dayKey}
                                type="button"
                                onClick={() => {
                                  if (!isAvailable) return;
                                  setSelectedDay(dayKey);
                                  setSelectedSlot("");
                                  setViewMode("week");
                                }}
                                className={`aspect-square rounded border p-2 text-sm transition ${
                                  isSelected
                                    ? "border-emerald-400 bg-emerald-800 text-emerald-50"
                                    : isAvailable
                                    ? "border-emerald-700 bg-emerald-950 text-emerald-200 hover:bg-emerald-900"
                                    : "border-neutral-800 bg-neutral-950 text-neutral-700 cursor-not-allowed"
                                }`}
                              >
                                <div className="flex h-full flex-col justify-between">
                                  <div className="font-medium">{dayNumber}</div>
                                  {isAvailable ? (
                                    <div className="text-[10px] text-emerald-300">Open</div>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={goPrevWeek}
                            className="rounded bg-neutral-900 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
                          >
                            Prev
                          </button>

                          <div className="text-sm text-neutral-200">
                            {weekStart.toLocaleDateString("default", {
                              month: "long",
                              day: "numeric",
                            })}{" "}
                            –{" "}
                            {weekDays[6].toLocaleDateString("default", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={goNextWeek}
                            className="rounded bg-neutral-900 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
                          >
                            Next
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-2 text-[10px] uppercase tracking-wide text-neutral-500">
                          {weekSlotsByDay.map(({ dayKey, date }) => (
                            <div key={dayKey} className="text-center py-1">
                              {date.toLocaleDateString("default", {
                                weekday: "short",
                              })}
                              <div className="mt-1 text-[10px] text-neutral-400 normal-case">
                                {date.toLocaleDateString("default", {
                                  month: "numeric",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2 items-start">
                          {weekSlotsByDay.map(({ dayKey, slots }) => (
                            <div
                              key={dayKey}
                              className="min-h-55 rounded border border-neutral-800 bg-neutral-950/50 p-2 space-y-2"
                            >
                              {slots.length === 0 ? (
                                <div className="text-[10px] text-neutral-600">
                                  No availability
                                </div>
                              ) : (
                                slots.map((slotIso) => {
                                  const d = new Date(slotIso);
                                  const isSelected = selectedSlot === slotIso;

                                  return (
                                    <button
                                      key={slotIso}
                                      type="button"
                                      onClick={() => {
                                        setSelectedDay(dayKey);
                                        setSelectedSlot(slotIso);
                                      }}
                                      className={`w-full rounded px-2 py-2 text-[11px] text-left transition ${
                                        isSelected
                                          ? "bg-blue-900 text-blue-100"
                                          : "bg-emerald-950 text-emerald-200 hover:bg-emerald-900"
                                      }`}
                                    >
                                      {d.toLocaleTimeString([], {
                                        hour: "numeric",
                                        minute: "2-digit",
                                      })}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}                      

                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                        Selected Appointment Time
                      </div>

                      {selectedSlot ? (
                        <div className="rounded border border-blue-900/60 bg-blue-950/30 px-3 py-3 text-sm text-blue-100">
                          {new Date(selectedSlot).toLocaleString("default", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-neutral-400">
                          Select a green appointment slot from the calendar.
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleBookAppointment}
                      disabled={!selectedSlot || isBooking || invite.status !== "ACTIVE"}
                      className="w-full rounded bg-emerald-800 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {isBooking ? "Booking..." : "Confirm Appointment"}
                    </button>
                  </>
                )}
              </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4 space-y-4">
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-emerald-100">
                Request Consultation
              </div>
              <div className="text-sm text-emerald-200/80">
                Search for the shop or artist you want to book with.
              </div>
            </div>

            {isLoadingDirectTarget ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-300">
                Loading booking link...
              </div>
            ) : null}

            {directTargetError ? (
              <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
                {directTargetError}
              </div>
            ) : null}

            {selectedBookingTarget ? (
              <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-wide text-emerald-300">
                  Selected
                </div>
                <div className="text-sm font-medium text-emerald-100">
                  {selectedBookingTarget.label}
                </div>
                <div className="text-xs text-emerald-200/80">
                  {selectedBookingTarget.sublabel}
                </div>
                <button
                  type="button"
                  onClick={resetConsultationSelection}
                  className="rounded bg-neutral-900 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
                >
                  Change artist/shop
                </button>
              </div>
            ) : (
              <form onSubmit={handleSearchBookingTargets} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search artist, shop, city, or Instagram..."
                    className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500"
                  />

                  <button
                    type="submit"
                    disabled={isSearching}
                    className="rounded bg-emerald-800 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </div>

                {searchError ? (
                  <div className="text-sm text-red-300">{searchError}</div>
                ) : null}

                <div className="space-y-3">
                  {searchResults.artists.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                        Artists
                      </div>

                      {searchResults.artists.map((artist) =>
                        artist.studios?.length ? (
                          artist.studios.map((studio) => (
                            <button
                              key={`${artist._id}-${studio._id}`}
                              type="button"
                              onClick={() => {
                                setSelectedBookingTarget({
                                  type: "artist",
                                  artistId: artist._id,
                                  studioId: studio._id,
                                  label: artist.displayName,
                                  sublabel: [
                                    artist.instagramHandle
                                      ? `@${artist.instagramHandle.replace(/^@/, "")}`
                                      : "",
                                    studio.name,
                                    [studio.city, studio.state].filter(Boolean).join(", "),
                                  ]
                                    .filter(Boolean)
                                    .join(" • "),
                                });
                                setSelectedDay("");
                                setSelectedSlot("");
                                setViewMode("month");
                              }}
                              className="w-full rounded border border-neutral-800 bg-neutral-950 p-3 text-left hover:bg-neutral-900"
                            >
                              <div className="text-sm font-medium text-neutral-100">
                                {artist.displayName}
                              </div>
                              <div className="text-xs text-neutral-400">
                                {[
                                  artist.instagramHandle
                                    ? `@${artist.instagramHandle.replace(/^@/, "")}`
                                    : "",
                                  studio.name,
                                  [studio.city, studio.state].filter(Boolean).join(", "),
                                ]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </div>
                            </button>
                          ))
                        ) : null
                      )}
                    </div>
                  ) : null}

                  {searchResults.studios.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                        Shops
                      </div>

                      {searchResults.studios.map((studio) => (
                        <div
                          key={studio._id}
                          className="rounded border border-neutral-800 bg-neutral-950 p-3 space-y-3"
                        >
                          <div>
                            <div className="text-sm font-medium text-neutral-100">
                              {studio.name}
                            </div>

                            <div className="text-xs text-neutral-400">
                              {[studio.address1, studio.city, studio.state, studio.postalCode]
                                .filter(Boolean)
                                .join(" • ")}
                            </div>
                          </div>

                          {Array.isArray(studio.artists) && studio.artists.length > 0 ? (
                            <div className="space-y-2">
                              <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                                Artists at this shop
                              </div>

                              {studio.artists.map((artist) => (
                                <button
                                  key={`${studio._id}-${artist._id}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBookingTarget({
                                      type: "artist",
                                      artistId: artist._id,
                                      studioId: studio._id,
                                      label: artist.displayName,
                                      sublabel: [
                                        artist.instagramHandle
                                          ? `@${artist.instagramHandle.replace(/^@/, "")}`
                                          : "",
                                        studio.name,
                                        [studio.city, studio.state].filter(Boolean).join(", "),
                                      ]
                                        .filter(Boolean)
                                        .join(" • "),
                                    });

                                    setSelectedDay("");
                                    setSelectedSlot("");
                                    setViewMode("month");
                                  }}
                                  className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-left hover:bg-neutral-800"
                                >
                                  <div className="text-sm font-medium text-neutral-100">
                                    {artist.displayName}
                                  </div>

                                  <div className="text-xs text-neutral-400">
                                    {[
                                      artist.instagramHandle
                                        ? `@${artist.instagramHandle.replace(/^@/, "")}`
                                        : "",
                                      artist.isGuest ? "Guest artist" : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-neutral-500">
                              No active artists found for this shop yet.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </form>
            )}
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 space-y-4">
            {!selectedSlot ? (
              <div className="rounded border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                Please select an available date first, then choose a time slot to continue.
              </div>
            ) : (
              <div className="rounded border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
                Date and time selected. You can complete your request below.
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-neutral-300">
                Available consultation times
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("month")}
                  className={`rounded px-3 py-2 text-xs ${
                    viewMode === "month"
                      ? "bg-neutral-700 text-neutral-100"
                      : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  Month
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("week")}
                  className={`rounded px-3 py-2 text-xs ${
                    viewMode === "week"
                      ? "bg-neutral-700 text-neutral-100"
                      : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  Week
                </button>
              </div>
            </div>

            {isLoadingConsultationSlots ? (
              <div className="text-sm text-neutral-400">
                Loading consultation availability...
              </div>
            ) : consultationSlotError ? (
              <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
                {consultationSlotError}
              </div>
            ) : availableDays.length === 0 ? (
              <div className="text-sm text-neutral-400">
                No consultation times are currently available.
              </div>
            ) : (
              <>
                {viewMode === "month" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={goPrevMonth}
                        className="rounded bg-neutral-900 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
                      >
                        Prev
                      </button>

                      <div className="text-sm font-medium text-neutral-200">
                        {monthYear}
                      </div>

                      <button
                        type="button"
                        onClick={goNextMonth}
                        className="rounded bg-neutral-900 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
                      >
                        Next
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-[10px] uppercase tracking-wide text-neutral-500">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="text-center py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`consult-empty-${i}`} />
                      ))}

                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNumber = i + 1;
                        const dayKey = getDayKey(dayNumber);
                        const isAvailable = isAvailableDay(dayNumber);
                        const isSelected = selectedDay === dayKey;

                        return (
                          <button
                            key={`consult-${dayKey}`}
                            type="button"
                            onClick={() => {
                              if (!isAvailable) return;
                              setSelectedDay(dayKey);
                              setSelectedSlot("");
                              setViewMode("week");
                            }}
                            className={`aspect-square rounded border p-2 text-sm transition ${
                              isSelected
                                ? "border-emerald-400 bg-emerald-800 text-emerald-50"
                                : isAvailable
                                ? "border-emerald-700 bg-emerald-950 text-emerald-200 hover:bg-emerald-900"
                                : "border-neutral-800 bg-neutral-950 text-neutral-700 cursor-not-allowed"
                            }`}
                          >
                            <div className="flex h-full flex-col justify-between">
                              <div className="font-medium">{dayNumber}</div>
                              {isAvailable ? (
                                <div className="text-[10px] text-emerald-300">
                                  Consult
                                </div>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={goPrevWeek}
                        className="rounded bg-neutral-900 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
                      >
                        Prev
                      </button>

                      <div className="text-sm text-neutral-200">
                        {weekStart.toLocaleDateString("default", {
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        –{" "}
                        {weekDays[6].toLocaleDateString("default", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={goNextWeek}
                        className="rounded bg-neutral-900 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800"
                      >
                        Next
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-2 items-start">
                      {weekSlotsByDay.map(({ dayKey, date, slots }) => (
                        <div
                          key={`consult-week-${dayKey}`}
                          className="min-h-55 rounded border border-neutral-800 bg-neutral-950/50 p-2 space-y-2"
                        >
                          <div className="text-center text-[10px] text-neutral-400">
                            {date.toLocaleDateString("default", {
                              weekday: "short",
                              month: "numeric",
                              day: "numeric",
                            })}
                          </div>

                          {slots.length === 0 ? (
                            <div className="text-[10px] text-neutral-600">
                              No availability
                            </div>
                          ) : (
                            slots.map((slotIso) => {
                              const d = new Date(slotIso);
                              const isSelected = selectedSlot === slotIso;

                              return (
                                <button
                                  key={`consult-slot-${slotIso}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedDay(dayKey);
                                    setSelectedSlot(slotIso);
                                  }}
                                  className={`w-full rounded px-2 py-2 text-[11px] text-left transition ${
                                    isSelected
                                      ? "bg-blue-900 text-blue-100"
                                      : "bg-emerald-950 text-emerald-200 hover:bg-emerald-900"
                                  }`}
                                >
                                  {d.toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </button>
                              );
                            })
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                    Selected Consultation Time
                  </div>

                  {selectedSlot ? (
                    <div className="rounded border border-emerald-900/60 bg-emerald-950/30 px-3 py-3 text-sm text-emerald-100">
                      {new Date(selectedSlot).toLocaleString("default", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-neutral-400">
                      Select a green consultation slot from the calendar.
              </div>
            )}
          </div>
            {selectedSlot ? (
              <>
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 space-y-3">
                  <div>
                    <div className="text-sm font-medium text-neutral-200">
                      Tell the artist about your project
                    </div>
                    <div className="text-xs text-neutral-500">
                      Project description is required. Everything else is optional.
                    </div>
                  </div>

                  <textarea
                    value={consultationDescription}
                    onChange={(e) => setConsultationDescription(e.target.value)}
                    placeholder="Project description — what would you like to get tattooed?"
                    rows={4}
                    className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500"
                  />

                  <input
                    type="text"
                    value={consultationPlacement}
                    onChange={(e) => setConsultationPlacement(e.target.value)}
                    placeholder="Placement — body area and approximate size"
                    className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500"
                  />

                  <textarea
                    value={consultationBudget}
                    onChange={(e) => setConsultationBudget(e.target.value)}
                    placeholder="Budget — budget range or budget notes"
                    rows={2}
                    className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500"
                  />

                  <textarea
                    value={consultationTimeframe}
                    onChange={(e) => setConsultationTimeframe(e.target.value)}
                    placeholder="Timeframe — ideal timing, important dates, travel plans, or flexibility"
                    rows={2}
                    className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500"
                  />

                  <div className="rounded border border-neutral-800 bg-neutral-950 px-3 py-3 space-y-2">
                    <div className="text-xs text-neutral-400">
                      Inspiration images
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []).slice(0, 3);

                        setConsultationImageRefs(
                          files.map((file, index) => ({
                            id: `local-placeholder-${index + 1}`,
                            name: file.name,
                            url: "",
                            status: "placeholder",
                          }))
                        );
                      }}
                      className="w-full text-xs text-neutral-400"
                    />

                    {consultationImageRefs.length > 0 ? (
                      <div className="space-y-1">
                        {consultationImageRefs.map((img) => (
                          <div key={img.id} className="text-xs text-neutral-500">
                            {img.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-600">
                        Optional — upload wiring will be connected later.
                      </div>
                    )}
                  </div>

                  <textarea
                    value={consultationNotes}
                    onChange={(e) => setConsultationNotes(e.target.value)}
                    placeholder="Additional notes — are you local or traveling? Allergies, health issues, accessibility needs, or anything else the artist should know."
                    rows={3}
                    className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRequestConsultation}
                  disabled={isRequestingConsultation}
                  className="w-full rounded bg-emerald-800 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isRequestingConsultation
                    ? "Submitting..."
                    : !selectedSlot
                    ? "Select a date and time first"
                    : "Submit Consultation Request"}
                </button>
              </>
            ) : (
              <div className="rounded border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                Select an available date and time first. The consultation request form will appear after a time is selected.
              </div>
            )}
        </>
      )}
    </div>
  </div>
)}
    </div>
  );
}