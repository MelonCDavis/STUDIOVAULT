import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../../services/apiClient";

function toggleDay(days, value) {
  if (days.includes(value)) {
    return days.filter((d) => d !== value);
  }
  return [...days, value];
}

function formatDateInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function toIsoDate(mmddyyyy) {
  const parts = mmddyyyy.split("-");
  if (parts.length !== 3) return "";

  const [mm, dd, yyyy] = parts;

  if (mm.length !== 2 || dd.length !== 2 || yyyy.length !== 4) return "";

  return `${yyyy}-${mm}-${dd}`;
}

export default function SchedulePage() {
  const STUDIO_ID = "69936f65681b262ca3739f92";
  const ARTIST_ID = "69936f65681b262ca3739f95";
  const [activeSection, setActiveSection] = useState("schedule");
  const [showConsultationInfoModal, setShowConsultationInfoModal] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleSaved, setScheduleSaved] = useState("");

  const [consultationSaving, setConsultationSaving] = useState(false);
  const [consultationError, setConsultationError] = useState("");
  const [consultationSaved, setConsultationSaved] = useState("");

  const [scheduleDraft, setScheduleDraft] = useState({
    workMode: "SET_SCHEDULE",
    startDate: "",
    endDate: "",
    daysOfWeek: [],
    startTime: "12:00",
    endTime: "20:00",
  });

  const [consultationDraft, setConsultationDraft] = useState({
    mode: "OPEN_ONLY",
    consultationDurationMinutes: 30,
    startDate: "",
    endDate: "",
    cascadeCount: 1,
  });

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setShowConsultationInfoModal(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    async function loadSchedule() {
      try {
        setScheduleLoading(true);
        setScheduleError("");

        const existing = await apiGet(
          `/api/staff/schedule?studioId=${STUDIO_ID}&artistProfileId=${ARTIST_ID}`
        );

        if (existing) {
          setScheduleDraft({
            workMode: existing.workMode || "SET_SCHEDULE",
            startDate: existing.startDate
              ? formatDateInput(
                  `${String(existing.startDate).slice(5, 7)}${String(existing.startDate).slice(8, 10)}${String(existing.startDate).slice(0, 4)}`
                )
              : "",
            endDate: existing.endDate
              ? formatDateInput(
                  `${String(existing.endDate).slice(5, 7)}${String(existing.endDate).slice(8, 10)}${String(existing.endDate).slice(0, 4)}`
                )
              : "",
            daysOfWeek: Array.isArray(existing.daysOfWeek)
              ? existing.daysOfWeek
              : [],
            startTime: existing.startTime || "12:00",
            endTime: existing.endTime || "20:00",
          });
        }

        const consultationExisting = await apiGet(
          `/api/staff/consultation-settings?studioId=${STUDIO_ID}&artistProfileId=${ARTIST_ID}`
        );

        if (consultationExisting) {
          setConsultationDraft({
            mode: consultationExisting.mode || "OPEN_ONLY",
            consultationDurationMinutes:
              consultationExisting.consultationDurationMinutes || 30,
            startDate: consultationExisting.startDate
              ? formatDateInput(
                  `${String(consultationExisting.startDate).slice(5, 7)}${String(consultationExisting.startDate).slice(8, 10)}${String(consultationExisting.startDate).slice(0, 4)}`
                )
              : "",
            endDate: consultationExisting.endDate
              ? formatDateInput(
                  `${String(consultationExisting.endDate).slice(5, 7)}${String(consultationExisting.endDate).slice(8, 10)}${String(consultationExisting.endDate).slice(0, 4)}`
                )
              : "",
            cascadeCount: consultationExisting.cascadeCount || 1,
          });
        }
      } catch (err) {
        setScheduleError("Could not load schedule.");
      } finally {
        setScheduleLoading(false);
      }
    }

    loadSchedule();
  }, []);

    async function handleSaveSchedule() {
    if (!scheduleDraft.startDate || !scheduleDraft.endDate) {
      setScheduleError("Start and end date are required.");
      return;
    }

    if (
      scheduleDraft.startDate.length !== 10 ||
      scheduleDraft.endDate.length !== 10
    ) {
      setScheduleError("Dates must be entered as MM-DD-YYYY.");
      return;
    }

    if (!toIsoDate(scheduleDraft.startDate) || !toIsoDate(scheduleDraft.endDate)) {
      setScheduleError("Dates must be entered as MM-DD-YYYY.");
      return;
    }

    if (!scheduleDraft.daysOfWeek.length) {
      setScheduleError("Select at least one day.");
      return;
    }

    if (
      scheduleDraft.workMode === "SET_SCHEDULE" &&
      (!scheduleDraft.startTime || !scheduleDraft.endTime)
    ) {
      setScheduleError("Start and end time are required.");
      return;
    }

    try {
      setScheduleSaving(true);
      setScheduleError("");
      setScheduleSaved("");

      await apiPatch("/api/staff/schedule", {
        studioId: STUDIO_ID,
        artistProfileId: ARTIST_ID,
        workMode: scheduleDraft.workMode,
        startDate: toIsoDate(scheduleDraft.startDate),
        endDate: toIsoDate(scheduleDraft.endDate),
        daysOfWeek: scheduleDraft.daysOfWeek,
        startTime: scheduleDraft.startTime,
        endTime: scheduleDraft.endTime,
      });

      setScheduleSaved("Schedule saved.");
    } catch (err) {
      console.error("Schedule save error:", err);
      setScheduleError("Could not save schedule.");
    } finally {
      setScheduleSaving(false);
    }
  }
  
  async function handleSaveConsultationSchedule() {
    const normalizedStartDate = formatDateInput(
      consultationDraft.startDate.replace(/\D/g, "")
    );
    const normalizedEndDate = formatDateInput(
      consultationDraft.endDate.replace(/\D/g, "")
    );

    if (!normalizedStartDate || !normalizedEndDate) {
      setConsultationError("Consultation start and end date are required.");
      return;
    }

    if (
      normalizedStartDate.length !== 10 ||
      normalizedEndDate.length !== 10
    ) {
      setConsultationError("Consultation dates must be entered as MM-DD-YYYY.");
      return;
    }

    if (
      !toIsoDate(normalizedStartDate) ||
      !toIsoDate(normalizedEndDate)
    ) {
      setConsultationError("Consultation dates must be entered as MM-DD-YYYY.");
      return;
    }

    try {
      setConsultationSaving(true);
      setConsultationError("");
      setConsultationSaved("");

      setConsultationDraft((prev) => ({
        ...prev,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
      }));

      const saved = await apiPatch("/api/staff/consultation-settings", {
        studioId: STUDIO_ID,
        artistProfileId: ARTIST_ID,
        mode: consultationDraft.mode,
        consultationDurationMinutes:
          consultationDraft.consultationDurationMinutes,
        startDate: toIsoDate(normalizedStartDate),
        endDate: toIsoDate(normalizedEndDate),
        cascadeCount: consultationDraft.cascadeCount,
      });

      setConsultationDraft((prev) => ({
        ...prev,
        mode: saved.mode || prev.mode,
        consultationDurationMinutes:
          saved.consultationDurationMinutes || prev.consultationDurationMinutes,
        startDate: saved.startDate
          ? formatDateInput(
              `${String(saved.startDate).slice(5, 7)}${String(saved.startDate).slice(8, 10)}${String(saved.startDate).slice(0, 4)}`
            )
          : normalizedStartDate,
        endDate: saved.endDate
          ? formatDateInput(
              `${String(saved.endDate).slice(5, 7)}${String(saved.endDate).slice(8, 10)}${String(saved.endDate).slice(0, 4)}`
            )
          : normalizedEndDate,
        cascadeCount: saved.cascadeCount || prev.cascadeCount,
      }));

      setConsultationSaved("Consultation schedule saved.");
    } catch (err) {
      console.error("Consultation save error:", err);
      setConsultationError("Could not save consultation schedule.");
    } finally {
      setConsultationSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Schedule</h1>
        <p className="text-sm text-neutral-400">
          Set your working schedule and default consultation behavior.
        </p>
      </div>

      <div className="flex gap-2 border-b border-neutral-800 pb-2">
        <button
          onClick={() => setActiveSection("schedule")}
          className={`px-3 py-2 rounded text-sm ${
            activeSection === "schedule"
              ? "bg-neutral-200 text-neutral-900"
              : "bg-neutral-800 hover:bg-neutral-700"
          }`}
        >
          Set Schedule
        </button>

        <button
          onClick={() => setActiveSection("consultations")}
          className={`px-3 py-2 rounded text-sm ${
            activeSection === "consultations"
              ? "bg-neutral-200 text-neutral-900"
              : "bg-neutral-800 hover:bg-neutral-700"
          }`}
        >
          Set Consultation Schedule
        </button>
      </div>

      {activeSection === "schedule" && (
        <div className="rounded border border-neutral-800 bg-neutral-900 p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Set Schedule</h2>
            <p className="text-sm text-neutral-400">
              Choose when you are available to work.
            </p>
            {scheduleLoading && (
              <div className="mt-2 text-sm text-neutral-400">Loading schedule...</div>
            )}

            {!!scheduleError && (
              <div className="mt-2 text-sm text-red-400">{scheduleError}</div>
            )}

            {!!scheduleSaved && (
              <div className="mt-2 text-sm text-green-400">{scheduleSaved}</div>
            )}
          </div>

          <div>
            <label className="text-xs text-neutral-400 block mb-2">
              Work Style
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="workMode"
                  checked={scheduleDraft.workMode === "SET_SCHEDULE"}
                  onChange={() =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      workMode: "SET_SCHEDULE",
                    }))
                  }
                />
                I work a set schedule
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="workMode"
                  checked={scheduleDraft.workMode === "BY_APPOINTMENT_ONLY"}
                  onChange={() =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      workMode: "BY_APPOINTMENT_ONLY",
                    }))
                  }
                />
                I work by appointment only
              </label>
            </div>
          </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-neutral-400 block mb-2">
                Start Date
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="MM-DD-YYYY"
                value={scheduleDraft.startDate}
                onChange={(e) =>
                  setScheduleDraft((prev) => ({
                    ...prev,
                    startDate: formatDateInput(e.target.value),
                  }))
                }
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-2">
                End Date
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="MM-DD-YYYY"
                value={scheduleDraft.endDate}
                onChange={(e) =>
                  setScheduleDraft((prev) => ({
                    ...prev,
                    endDate: formatDateInput(e.target.value),
                  }))
                }
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-400 block mb-2">
              Days of Week
            </label>

            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {[
                { label: "Sun", value: 0 },
                { label: "Mon", value: 1 },
                { label: "Tue", value: 2 },
                { label: "Wed", value: 3 },
                { label: "Thu", value: 4 },
                { label: "Fri", value: 5 },
                { label: "Sat", value: 6 },
              ].map((day) => {
                const active = scheduleDraft.daysOfWeek.includes(day.value);

                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() =>
                      setScheduleDraft((prev) => ({
                        ...prev,
                        daysOfWeek: toggleDay(prev.daysOfWeek, day.value),
                      }))
                    }
                    className={`rounded px-2 py-2 text-xs border ${
                      active
                        ? "bg-neutral-200 text-neutral-900 border-neutral-200"
                        : "bg-neutral-950 text-neutral-300 border-neutral-700"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {scheduleDraft.workMode === "SET_SCHEDULE" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-neutral-400 block mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={scheduleDraft.startTime}
                  onChange={(e) =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                  className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={scheduleDraft.endTime}
                  onChange={(e) =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                  className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="rounded border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm text-neutral-400">
              Clients will not see general availability. You can still manage
              consultations and appointment offers manually.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={scheduleSaving}
              className="px-3 py-2 rounded bg-indigo-700 hover:bg-indigo-600 text-sm disabled:opacity-50"
            >
              {scheduleSaving ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </div>
      )}

      {activeSection === "consultations" && (
        <div className="rounded border border-neutral-800 bg-neutral-900 p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Set Consultation Schedule</h2>
              <p className="text-sm text-neutral-400">
                Choose how your default consultations are placed.
              </p>

              {!!consultationError && (
                <div className="mt-2 text-sm text-red-400">{consultationError}</div>
              )}

              {!!consultationSaved && (
                <div className="mt-2 text-sm text-green-400">{consultationSaved}</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowConsultationInfoModal(true)}
              className="h-7 w-7 rounded-full border border-neutral-700 bg-neutral-950 text-xs text-neutral-300 hover:bg-neutral-900"
              title="Consultation schedule info"
              aria-label="Consultation schedule info"
            >
              i
            </button>
          </div>

          <div>
            <label className="text-xs text-neutral-400 block mb-2">
              Consultation Mode
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                ["OPEN_ONLY", "Open"],
                ["CLOSE_ONLY", "Close"],
                ["OPEN_MAGNETIC", "Open Cascading"],
                ["CLOSE_MAGNETIC", "Close Cascading"],
                ["FULLY_OPEN", "Fully Open"],
                ["ARTIST_CONTROLLED", "I Set My Own Consultations"],
              ].map(([value, label]) => {
                const active = consultationDraft.mode === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setConsultationDraft((prev) => ({
                        ...prev,
                        mode: value,
                      }))
                    }
                    className={`rounded border px-3 py-3 text-left text-sm ${
                      active
                        ? "bg-neutral-200 text-neutral-900 border-neutral-200"
                        : "bg-neutral-950 text-neutral-200 border-neutral-700"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-400 block mb-2">
              Default Consultation Duration
            </label>
            <select
              value={consultationDraft.consultationDurationMinutes}
              onChange={(e) =>
                setConsultationDraft((prev) => ({
                  ...prev,
                  consultationDurationMinutes: parseInt(e.target.value, 10),
                }))
              }
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-neutral-400 block mb-2">
                Start Date
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="MM-DD-YYYY"
                value={consultationDraft.startDate}
                onChange={(e) =>
                  setConsultationDraft((prev) => ({
                    ...prev,
                    startDate: formatDateInput(e.target.value),
                  }))
                }
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-2">
                End Date
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="MM-DD-YYYY"
                value={consultationDraft.endDate}
                onChange={(e) =>
                  setConsultationDraft((prev) => ({
                    ...prev,
                    endDate: formatDateInput(e.target.value),
                  }))
                }
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {(consultationDraft.mode === "OPEN_MAGNETIC" ||
            consultationDraft.mode === "CLOSE_MAGNETIC") && (
            <div>
              <label className="text-xs text-neutral-400 block mb-2">
                Cascade Count
              </label>
              <select
                value={consultationDraft.magneticCount}
                onChange={(e) =>
                  setConsultationDraft((prev) => ({
                    ...prev,
                    cascadeCount: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
          )}

          {consultationDraft.mode === "ARTIST_CONTROLLED" && (
            <div className="rounded border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm text-neutral-400">
              Consultation timing stays fully under artist control. Clients will
              not see direct consultation slots until you create or offer them.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveConsultationSchedule}
              disabled={consultationSaving}
              className="px-3 py-2 rounded bg-indigo-700 hover:bg-indigo-600 text-sm disabled:opacity-50"
            >
              {consultationSaving ? "Saving..." : "Save Consultation Schedule"}
            </button>
          </div>
        </div>
      )}
      {showConsultationInfoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setShowConsultationInfoModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Consultation Options</h3>
                <p className="text-sm text-neutral-400">
                  Here is how each consultation mode works.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowConsultationInfoModal(false)}
                className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
                aria-label="Close consultation info"
              >
                X
              </button>
            </div>

            <div className="space-y-3 text-sm text-neutral-300">
              <div>
                <div className="font-semibold">Open</div>
                <div className="text-neutral-400">
                  Places a consultation at the opening of the artist’s scheduled availability.
                </div>
              </div>

              <div>
                <div className="font-semibold">Close</div>
                <div className="text-neutral-400">
                  Places a consultation at the close of the artist’s scheduled availability.
                </div>
              </div>

              <div>
                <div className="font-semibold">Open Cascading</div>
                <div className="text-neutral-400">
                  Places consultation slots starting from the opening of availability and continues forward based on consultation duration and count.
                </div>
              </div>

              <div>
                <div className="font-semibold">Close Cascading</div>
                <div className="text-neutral-400">
                  Places consultation slots starting from the end of availability and continues backward based on consultation duration and count.
                </div>
              </div>

              <div>
                <div className="font-semibold">Fully Open</div>
                <div className="text-neutral-400">
                  Allows consultation opportunities throughout the selected date range according to the artist’s schedule and consultation settings.
                </div>
              </div>

              <div>
                <div className="font-semibold">I Set My Own Consultations</div>
                <div className="text-neutral-400">
                  Keeps consultation timing fully under artist control. Clients do not see direct consultation slots until the artist creates or offers them.
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowConsultationInfoModal(false)}
                className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}