import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
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

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

export default function CalendarPage() {
    const location = useLocation();
    // TEMP — replace with real context later
    const STUDIO_ID = "69936f65681b262ca3739f92";
    const ARTIST_ID = "69936f65681b262ca3739f95";
    const SERVICE_ID = "69936f65681b262ca3739f97";
    const LS_KEY = "studiovault_staff_calendar_v1";
    const CALENDAR_LAUNCH_KEY = "studiovault_staff_calendar_launch_v1";
    const today = new Date();

    // TEMP — replace with real auth/context role later
    const STAFF_ROLE = "ARTIST";

    const canSeeFullCalendar = STAFF_ROLE === "ARTIST";
    const canCreateAppointments = STAFF_ROLE === "ARTIST";
    const canCreateManualConsultation = STAFF_ROLE === "ARTIST";
    const isPresetConsultationOnlyRole = ["FRONT_DESK", "MANAGER", "OWNER"].includes(STAFF_ROLE);

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

    const [deleteTargetId, setDeleteTargetId] = useState(null);

    const [confirmedBookings, setConfirmedBookings] = useState([]);
    const [confirmedConsultations, setConfirmedConsultations] = useState([]);
    const [consultationSlots, setConsultationSlots] = useState([]);
    const [consultationLoading, setConsultationLoading] = useState(false);
    const [consultationError, setConsultationError] = useState("");
    const [consultationSubmitting, setConsultationSubmitting] = useState(false);

    const [clientContext, setClientContext] = useState(null);
    const [launchPrefillClient, setLaunchPrefillClient] = useState(null);

    const [ui, setUi] = useState({
      panel: "day", // day | appointment | consultation
      focusedTime: null, // Date | null
      bookingDraft: null, // appointment draft only
      selectedConsultationSlot: null, // consultation draft only
      slotPicker: null, // { start, isConsultationPlaceholder } | null
      slotPickerSelection: "appointment", // appointment | consultation
      launchIntent: null, // appointment | consultation | null
    });

        function resetTransientUi() {
      setUi((prev) => ({
        ...prev,
        focusedTime: null,
        bookingDraft: null,
        selectedConsultationSlot: null,
        slotPicker: null,
        slotPickerSelection: "appointment",
      }));
    }

    function openDayPanel(dateValue, options = {}) {
      const preserveLaunch = options.preserveLaunch === true;

      setSelectedDate(dateValue || null);

      if (!preserveLaunch) {
        clearCalendarLaunchState({ clearClient: false });
      }

      setUi((prev) => ({
        ...prev,
        panel: "day",
        focusedTime: null,
        bookingDraft: null,
        selectedConsultationSlot: null,
        slotPicker: null,
        slotPickerSelection: "appointment",
        launchIntent: preserveLaunch ? prev.launchIntent : null,
      }));
    }

    function openAppointmentPanel({ start, draft }) {
      setSelectedDate(start);
      setUi((prev) => ({
        ...prev,
        panel: "appointment",
        focusedTime: start,
        bookingDraft: draft,
        selectedConsultationSlot: null,
        slotPicker: null,
        slotPickerSelection: "appointment",
      }));
    }

    function openConsultationPanel({ start, slot }) {
      setSelectedDate(start);
      setUi((prev) => ({
        ...prev,
        panel: "consultation",
        focusedTime: null,
        bookingDraft: null,
        selectedConsultationSlot: slot,
        slotPicker: null,
        slotPickerSelection: "appointment",
      }));
    }

    function openSlotPicker(start, isConsultationPlaceholder = false) {
      setUi((prev) => ({
        ...prev,
        slotPicker: {
          start,
          isConsultationPlaceholder,
        },
        slotPickerSelection:
          prev.launchIntent === "consultation" && isConsultationPlaceholder
            ? "consultation"
            : "appointment",
      }));
    }

    function closeSlotPicker() {
      setUi((prev) => ({
        ...prev,
        slotPicker: null,
        slotPickerSelection: "appointment",
      }));
    }

    function resetClientContext() {
      setClientContext({
        selectedClientId: "",
        legalName: "",
        preferredName: "",
        pronouns: "",
        phone: "",
        email: "",
        isAdult: true,
        dateOfBirth: "",
      });
      setLaunchPrefillClient(null);
    }

    function clearCalendarLaunchState(options = {}) {
      const clearClient = options.clearClient === true;

      try {
        localStorage.removeItem(CALENDAR_LAUNCH_KEY);
      } catch {}

      if (clearClient) {
        setClientContext(null);
        setLaunchPrefillClient(null);
      }

      setUi((prev) => ({
        ...prev,
        launchIntent: null,
      }));
    }

    function consumeCalendarLaunchKey() {
      try {
        const launchFromRoute = location.state?.calendarLaunch || null;

        let parsed = launchFromRoute;

        if (!parsed) {
          const raw = localStorage.getItem(CALENDAR_LAUNCH_KEY);

          if (!raw) {
            clearCalendarLaunchState();
            return;
          }

          localStorage.removeItem(CALENDAR_LAUNCH_KEY);
          parsed = JSON.parse(raw);
        }

        if (!parsed?.type) {
          clearCalendarLaunchState();
          return;
        }

        try {
          const rawCalendarState = localStorage.getItem(LS_KEY);
          if (rawCalendarState) {
            const parsedCalendarState = JSON.parse(rawCalendarState);
            localStorage.setItem(
              LS_KEY,
              JSON.stringify({
                ...parsedCalendarState,
                activeAppointmentId: null,
                sidebarMode: "day",
              })
            );
          }
        } catch {}

        const nextClientContext = {
          selectedClientId: parsed.selectedClientId || "",
          legalName: parsed.clientName || "",
          preferredName: parsed.preferredName || "",
          pronouns: parsed.pronouns || "",
          phone: parsed.phone || "",
          email: parsed.email || "",
          isAdult: parsed.isAdult !== false,
          dateOfBirth: parsed.dateOfBirth || "",
        };

        const now = new Date();
        setSelectedDate(now);
        setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setClientContext(nextClientContext);
        setLaunchPrefillClient(nextClientContext);

        setUi((prev) => ({
          ...prev,
          panel: "day",
          focusedTime: null,
          bookingDraft: null,
          selectedConsultationSlot: null,
          slotPicker: null,
          slotPickerSelection: "appointment",
          launchIntent:
            parsed.type === "consultation_prefill" ? "consultation" : "appointment",
        }));
      } catch {
        clearCalendarLaunchState();
      }
    }

    function buildLaunchedAppointmentDraft(startValue = null) {
      const start = startValue ? new Date(startValue) : new Date();
      const source = launchPrefillClient || clientContext;

      return {
        id: null,
        start,
        hours: 1,
        minutes: 0,
        selectedClientId: source?.selectedClientId || "",
        legalName: source?.legalName || "",
        preferredName: source?.preferredName || "",
        pronouns: source?.pronouns || "",
        phone: source?.phone || "",
        email: source?.email || "",
        service: "",
        notes: "",
        status: "booked",
        isAdult: source?.isAdult ?? true,
        dateOfBirth: source?.dateOfBirth || "",
      };
    }

    useEffect(() => {
      consumeCalendarLaunchKey();
    }, [location.state]);

    useEffect(() => {
      if (ui.launchIntent !== "appointment") return;
      if (!clientContext) return;
      if (ui.bookingDraft) return;

      setUi((prev) => ({
        ...prev,
        bookingDraft: buildLaunchedAppointmentDraft(selectedDate || new Date()),
      }));
    }, [ui.launchIntent, clientContext, selectedDate, ui.bookingDraft]);

    useEffect(() => {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            viewMode,
            selectedDate: selectedDate ? selectedDate.toISOString() : null,
            sidebarMode: ui.panel,
            activeAppointmentId: ui.bookingDraft?.id || null,
          })
        );
      } catch {}
    }, [viewMode, selectedDate, ui.panel, ui.bookingDraft?.id]);

    useEffect(() => {
      return () => {
        resetClientContext();
      };
    }, []);

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
              clientName:
                a.clientId?.preferredName ||
                a.clientId?.legalName ||
                "",
              legalName: a.clientId?.legalName || "",
              preferredName: a.clientId?.preferredName || "",
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

         async function fetchConsultationsInRange() {
          try {
            const res = await apiGet(
              `/api/staff/consultations?studioId=${STUDIO_ID}&artistProfileId=${ARTIST_ID}`
            );

            if (!Array.isArray(res)) {
              setConfirmedConsultations([]);
              return;
            }

            const normalized = res.map((c) => {
              const start = new Date(c.startsAt);
              const durationMinutes = 30;
              const end = new Date(start.getTime() + durationMinutes * 60000);

              return {
                id: c._id,
                clientId: c.clientId?._id || c.clientId || "",
                start,
                end,
                status: c.status,
                clientName:
                  c.clientId?.preferredName ||
                  c.clientId?.legalName ||
                  "",
                legalName: c.clientId?.legalName || "",
                preferredName: c.clientId?.preferredName || "",
                phone: c.clientId?.phoneE164 || "",
                email: c.clientId?.email || "",
                description: c.intake?.description || "",
                preferredDate: c.intake?.preferredDate || "",
                travelInfo: c.intake?.travelInfo || "",
                budget: c.intake?.budget || "",
                imageRefs: Array.isArray(c.intake?.imageRefs) ? c.intake.imageRefs : [],
                messages: Array.isArray(c.messages) ? c.messages : [],
              };
            });

            setConfirmedConsultations(normalized);
          } catch (err) {
            console.error("Fetch consultations failed", err);
            setConfirmedConsultations([]);
          }
        }

        async function fetchConsultationAvailability(fromDate, toDate) {
          try {
            setConsultationLoading(true);
            setConsultationError("");

          const res = await apiGet(
            `/api/staff/consultations/availability?studioId=${STUDIO_ID}&artistProfileId=${ARTIST_ID}&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`
          );

          const rawSlots = Array.isArray(res)
            ? res
            : Array.isArray(res?.slots)
            ? res.slots
            : [];
          
          const normalized = rawSlots
            .map((slot) => {
              if (typeof slot === "string") {
                const start = new Date(slot);
                const end = new Date(start.getTime() + 30 * 60000);

                return {
                  id: slot,
                  start,
                  end,
                  durationMinutes: 30,
                };
              }

              const startsAt =
                slot.startsAt ||
                slot.start ||
                slot.slotStart ||
                slot.iso ||
                null;

              const endsAt =
                slot.endsAt ||
                slot.end ||
                slot.slotEnd ||
                null;

              if (!startsAt) return null;

              const start = new Date(startsAt);
              const durationMinutes =
                slot.durationMinutes ||
                slot.consultationDurationMinutes ||
                (endsAt
                  ? Math.round((new Date(endsAt) - start) / 60000)
                  : 30);

              const end = endsAt
                ? new Date(endsAt)
                : new Date(start.getTime() + durationMinutes * 60000);

              return {
                id:
                  slot._id ||
                  slot.id ||
                  `${start.toISOString()}-${end.toISOString()}`,
                start,
                end,
                durationMinutes,
              };
            })
            .filter(Boolean)
            .sort((a, b) => a.start - b.start);

            setConsultationSlots(normalized);
          } catch (err) {
            console.error("Fetch consultation availability failed", err);
            console.error("Fetch consultation availability failed message", err?.message);
            console.error("Fetch consultation availability failed response", err?.response?.data);
            setConsultationSlots([]);
            setConsultationError("Could not load consultation availability.");
          } finally {
            setConsultationLoading(false);
          }
        }

        async function createConsultationFromSelectedSlot() {
          const clientContext = consultationClient;

          const hasName =
            (clientContext?.legalName || "").trim().length > 0 ||
            (clientContext?.preferredName || "").trim().length > 0;
          const hasPhone = (clientContext?.phone || "").trim().length > 0;
          const hasEmail = (clientContext?.email || "").trim().length > 0;

          if (!selectedConsultationSlot?.start) {
            alert("Select a consultation slot first.");
            return;
          }

          if (selectedConsultationSlot.start < new Date()) {
            alert("That consultation slot is no longer available.");
            return;
          }

          if (!clientContext?.selectedClientId) {
            if (!hasName) {
              alert("Client name is required for consultation.");
              return;
            }

            if (!hasPhone && !hasEmail) {
              alert("Add a phone number or email for consultation client lookup.");
              return;
            }
          }

          try {
            setConsultationSubmitting(true);

            const payload = {
              studioId: STUDIO_ID,
              artistProfileId: ARTIST_ID,
              startsAt: selectedConsultationSlot.start.toISOString(),
              message: `Consultation scheduled for ${selectedConsultationSlot.start.toLocaleString()}`,
            };

            if (clientContext?.selectedClientId) {
              payload.clientId = clientContext.selectedClientId;
            } else {
              payload.legalName = (clientContext.legalName || "").trim();
              payload.preferredName = (clientContext.preferredName || "").trim();
              payload.pronouns = (clientContext.pronouns || "").trim();
              payload.phone = (clientContext.phone || "").trim();
              payload.email = (clientContext.email || "").trim().toLowerCase();
              payload.isAdult = clientContext.isAdult ?? true;

              if (clientContext.isAdult === false) {
                if (!clientContext.dateOfBirth) {
                  alert("Date of birth is required for minors.");
                  return;
                }

                payload.dateOfBirth = clientContext.dateOfBirth;
              }
            }

            await apiPost("/api/staff/consultations", payload);

            const rangeStart = new Date(year, month, 1, 0, 0, 0, 0);
            const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

            await fetchConsultationAvailability(rangeStart, rangeEnd);
            await fetchConsultationsInRange();

            resetClientContext();
            openDayPanel(selectedConsultationSlot.start);

            alert("Consultation created.");
          } catch (err) {
            console.error("Create consultation failed", err);

            const duplicate = err?.status === 409 && err?.response?.duplicate;
            const existing = err?.response?.existingClient;

            if (duplicate && existing) {
              const existingLabel =
                existing.preferredName ||
                existing.legalName ||
                existing.email ||
                existing.phoneE164 ||
                "existing client";

              const saveAnyway = window.confirm(
                `Client already exists as "${existingLabel}". Save anyway?`
              );

              if (saveAnyway) {
                const payload = {
                  studioId: STUDIO_ID,
                  artistProfileId: ARTIST_ID,
                  startsAt: selectedConsultationSlot.start.toISOString(),
                  message: `Consultation scheduled for ${selectedConsultationSlot.start.toLocaleString()}`,
                  legalName: (clientContext?.legalName || "").trim(),
                  preferredName: (clientContext?.preferredName || "").trim(),
                  pronouns: (clientContext?.pronouns || "").trim(),
                  phone: (clientContext?.phone || "").trim(),
                  email: (clientContext?.email || "").trim().toLowerCase(),
                  isAdult: clientContext?.isAdult ?? true,
                  forceCreate: true,
                };

                if (clientContext?.isAdult === false && clientContext?.dateOfBirth) {
                  payload.dateOfBirth = clientContext.dateOfBirth;
                }

                await apiPost("/api/staff/consultations", payload);

                const rangeStart = new Date(year, month, 1, 0, 0, 0, 0);
                const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

                await fetchConsultationAvailability(rangeStart, rangeEnd);
                await fetchConsultationsInRange();

                resetClientContext();
                openDayPanel(selectedConsultationSlot.start);
                alert("Consultation created.");
                return;
              }

              return;
            }

            alert(err?.response?.error || "Consultation creation failed");
          } finally {
            setConsultationSubmitting(false);
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
      const clickedDate = new Date(year, month, dayNumber);

      if (clickedDate < startOfToday()) return;

      if (isConsultationLaunch) {
        if (STAFF_ROLE !== "ARTIST" && !dayHasConsultationAvailability(clickedDate)) {
          return;
        }

        setClientContext((prev) => ({
          selectedClientId: prev?.selectedClientId || "",
          legalName: prev?.legalName || "",
          preferredName: prev?.preferredName || "",
          pronouns: prev?.pronouns || "",
          phone: prev?.phone || "",
          email: prev?.email || "",
          isAdult: prev?.isAdult ?? true,
          dateOfBirth: prev?.dateOfBirth || "",
        }));

        openConsultationPanel({
          start: clickedDate,
          slot: null,
        });
        return;
      }

      openDayPanel(clickedDate, { preserveLaunch: Boolean(launchIntent) });
    };

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

      if (start < new Date()) return;

      const slotEnd = new Date(start.getTime() + 15 * 60000);

      const existingBooking = confirmedBookings.find((b) =>
        !["CANCELLED", "NO_SHOW"].includes(b.status) &&
        isSameDay(b.start, start) &&
        overlaps(start, slotEnd, b.start, b.end)
      );

      if (existingBooking) {
        openAppointmentDraft(existingBooking.start);
        closeSlotPicker();
        return;
      }

      const bookedConsultation = findBookedConsultation(start, slotEnd);
      if (bookedConsultation) {
        openDayPanel(bookedConsultation.start);
        return;
      }

      const openConsultationPlaceholder = findOpenConsultationPlaceholder(start);

      // ===== ARTIST BEHAVIOR =====
      if (STAFF_ROLE === "ARTIST") {
        if (isConsultationLaunch) {
          // preset slot
          if (openConsultationPlaceholder) {
            openConsultationPanel({
              start,
              slot: openConsultationPlaceholder,
            });
            return;
          }

          // manual consultation anywhere
          openConsultationDraftFromSlot(start);
          return;
        }

        openSlotPicker(start, !!openConsultationPlaceholder);
        return;
      }

      // ===== NON ARTIST BEHAVIOR =====
      // only preset consultation slots allowed
      if (openConsultationPlaceholder) {
        openConsultationPanel({
          start,
          slot: openConsultationPlaceholder,
        });
      }
    };

    function openAppointmentDraft(start) {
      closeSlotPicker();

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

      if (existingBooking) {
        openAppointmentPanel({
          start: existingBooking.start,
          draft: {
            id: existingBooking.id,
            start: existingBooking.start,
            hours: Math.floor((existingBooking.end - existingBooking.start) / 3600000),
            minutes: ((existingBooking.end - existingBooking.start) % 3600000) / 60000,
            legalName: existingBooking.legalName || existingBooking.clientName || "",
            preferredName: existingBooking.preferredName || "",
            pronouns: "",
            phone: existingBooking.phone,
            email: existingBooking.email,
            service: existingBooking.service,
            notes: existingBooking.notes,
            status: toUiStatus(existingBooking.status),
            isAdult: true,
            dateOfBirth: "",
          },
        });
        return;
      }
            
      openAppointmentPanel({
        start,
        draft: {
          ...buildLaunchedAppointmentDraft(start),
          start,
        },
      });
      if (isAppointmentLaunch) {
        clearCalendarLaunchState({ clearClient: false });
      }
    }

    function openConsultationDraftFromSlot(start) {
      closeSlotPicker();

      openConsultationPanel({
        start,
        slot: {
          id: `manual-${start.toISOString()}`,
          start,
          end: new Date(start.getTime() + 30 * 60000),
          durationMinutes: 30,
        },
      });
    }

    const sidebarMode = ui.panel;
    const focusedSlot = ui.focusedTime;
    const bookingDraft = ui.bookingDraft;
    const selectedConsultationSlot = ui.selectedConsultationSlot;
    const slotTypePicker = ui.slotPicker;
    const slotTypePickerSelection = ui.slotPickerSelection;
    const launchIntent = ui.launchIntent;

    const consultationClient = launchPrefillClient || clientContext || {
      selectedClientId: "",
      legalName: "",
      preferredName: "",
      pronouns: "",
      phone: "",
      email: "",
      isAdult: true,
      dateOfBirth: "",
    };

    const activeClientContext = clientContext;
    const isConsultationLaunch = launchIntent === "consultation";
    const isAppointmentLaunch = launchIntent === "appointment";

    const visibleBookings = canSeeFullCalendar ? confirmedBookings : [];
    const visibleConfirmedConsultations = canSeeFullCalendar ? confirmedConsultations : [];

    const activeDate = focusedSlot || selectedDate;

    function setSidebarMode(nextPanel) {
      setUi((prev) => ({
        ...prev,
        panel: typeof nextPanel === "function" ? nextPanel(prev.panel) : nextPanel,
      }));
    }

    function setFocusedSlot(nextValue) {
      setUi((prev) => ({
        ...prev,
        focusedTime:
          typeof nextValue === "function" ? nextValue(prev.focusedTime) : nextValue,
      }));
    }

    function setBookingDraft(nextValue) {
      setUi((prev) => ({
        ...prev,
        bookingDraft:
          typeof nextValue === "function" ? nextValue(prev.bookingDraft) : nextValue,
      }));
    }

    function setSelectedConsultationSlot(nextValue) {
      setUi((prev) => ({
        ...prev,
        selectedConsultationSlot:
          typeof nextValue === "function"
            ? nextValue(prev.selectedConsultationSlot)
            : nextValue,
      }));
    }

    function setSlotTypePicker(nextValue) {
      setUi((prev) => ({
        ...prev,
        slotPicker:
          typeof nextValue === "function" ? nextValue(prev.slotPicker) : nextValue,
      }));
    }

    function setSlotTypePickerSelection(nextValue) {
      setUi((prev) => ({
        ...prev,
        slotPickerSelection:
          typeof nextValue === "function"
            ? nextValue(prev.slotPickerSelection)
            : nextValue,
      }));
    }

    function setLaunchIntent(nextValue) {
      setUi((prev) => ({
        ...prev,
        launchIntent:
          typeof nextValue === "function" ? nextValue(prev.launchIntent) : nextValue,
      }));
    }

    function updateConsultationClientField(field, value) {
      const updater = (prev) => ({
        selectedClientId: prev?.selectedClientId || "",
        legalName: prev?.legalName || "",
        preferredName: prev?.preferredName || "",
        pronouns: prev?.pronouns || "",
        phone: prev?.phone || "",
        email: prev?.email || "",
        isAdult: prev?.isAdult ?? true,
        dateOfBirth: prev?.dateOfBirth || "",
        ...prev,
        [field]: value,
      });

      setClientContext(updater);
      setLaunchPrefillClient(updater);
    }

    function clearConsultationClientSelection() {
      const updater = (prev) => ({
        selectedClientId: "",
        legalName: prev?.legalName || "",
        preferredName: prev?.preferredName || "",
        pronouns: prev?.pronouns || "",
        phone: prev?.phone || "",
        email: prev?.email || "",
        isAdult: prev?.isAdult ?? true,
        dateOfBirth: prev?.dateOfBirth || "",
      });

      setClientContext(updater);
      setLaunchPrefillClient(updater);
    }

    useEffect(() => {
        if (viewMode === "week" && weekScrollRef.current) {
          const slotHeight = 16 * 4; 
          const defaultHour = 12;
          const scrollTo = (defaultHour - START_HOUR) * slotHeight;

          weekScrollRef.current.scrollTop = scrollTo;
        }
    }, [viewMode]);

    const dayBookings = activeDate
      ? visibleBookings
        .filter((b) => isSameDay(b.start, activeDate))
        .filter((b) => !["CANCELLED", "NO_SHOW"].includes(b.status))
        .sort((a, b) => a.start - b.start)
      : [];
    
    const dayConsultationSlots = activeDate
      ? consultationSlots
          .filter((slot) => isSameDay(slot.start, activeDate))
          .sort((a, b) => a.start - b.start)
      : [];  

    const dayConfirmedConsultations = activeDate
      ? visibleConfirmedConsultations
          .filter((c) => isSameDay(c.start, activeDate))
          .filter((c) => ["REQUESTED", "ACCEPTED"].includes(c.status))
          .sort((a, b) => a.start - b.start)
      : [];

    const dayOpenConsultationPlaceholders = activeDate
      ? consultationSlots
          .filter((slot) => isSameDay(slot.start, activeDate))
          .filter(
            (slot) =>
              !visibleConfirmedConsultations.some((c) =>
                ["REQUESTED", "ACCEPTED"].includes(c.status) &&
                overlaps(slot.start, slot.end, c.start, c.end)
              )
          )
          .sort((a, b) => a.start - b.start)
      : [];

    const isManualConsultationDraft = isManualConsultationSelection(selectedConsultationSlot);
    const consultationPanelSlots = isManualConsultationDraft
      ? []
      : dayConsultationSlots;

    function dayHasConsultationAvailability(dateObj) {
      return consultationSlots.some((slot) => isSameDay(slot.start, dateObj));
    }

    function findOpenConsultationPlaceholder(start) {
      return consultationSlots.find(
        (slot) => slot.start.getTime() === start.getTime()
      );
    }

    function findBookedConsultation(start, end) {
      return visibleConfirmedConsultations.find(
        (c) =>
          ["REQUESTED", "ACCEPTED"].includes(c.status) &&
          overlaps(start, end, c.start, c.end)
      );
    }

    function isManualConsultationSelection(slot) {
      return Boolean(slot?.id && String(slot.id).startsWith("manual-"));
    }

      useEffect(() => {
        const rangeStart = new Date(year, month, 1, 0, 0, 0, 0);
        const rangeEnd = new Date(year, month + 1, 0, 23, 59 ,59, 999);

        fetchAppointmentsInRange(rangeStart, rangeEnd);
        fetchConsultationsInRange();
      }, [year, month]);

      useEffect(() => {
        const rangeStart = new Date(year, month, 1, 0, 0, 0, 0);
        const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

        fetchConsultationAvailability(rangeStart, rangeEnd);
      }, [year, month]);

      useEffect(() => {
        try {
          if (launchIntent || clientContext) return;

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
            minutes: ((match.end - match.start) % 3600000) / 60000,
            legalName: match.clientName || "",
            preferredName: "",
            pronouns: "",
            phone: match.phone,
            email: match.email,
            service: match.service,
            notes: match.notes,
            status: toUiStatus(match.status),
            isAdult: true,
            dateOfBirth: "",
          });
        } catch {}
      }, [confirmedBookings, launchIntent, clientContext]);

      async function approveConsultation(consultationId) {
        const artistMessage = window.prompt(
          "Optional message to client for approved consultation:",
          "Your consultation request has been approved. We will follow up with next steps shortly."
        );

        if (artistMessage === null) return;

        try {
          await apiPatch(`/api/staff/consultations/${consultationId}/approve`, {
            message: artistMessage,
          });

          await fetchConsultationsInRange();
        } catch (err) {
          console.error("Approve consultation failed", err);
          alert(err?.response?.error || "Failed to approve consultation");
        }
      }

      async function declineConsultation(consultationId) {
        const artistMessage = window.prompt(
          "Optional message to client for declined consultation:",
          "Your consultation request was declined. Please contact the studio if you have questions."
        );

        if (artistMessage === null) return;

        try {
          await apiPatch(`/api/staff/consultations/${consultationId}/decline`, {
            message: artistMessage,
          });

          await fetchConsultationsInRange();
        } catch (err) {
          console.error("Decline consultation failed", err);
          alert(err?.response?.error || "Failed to decline consultation");
        }
      }

      async function sendBookingLinkForConsultation(consultation) {
        const messageToClient = window.prompt(
          "Message to client with booking link:",
          "Your consultation has been approved. Use this booking link to choose your appointment time."
        );

        if (messageToClient === null) return;

        try {
          const validFrom = new Date();
          const validUntil = new Date();
          validUntil.setDate(validUntil.getDate() + 14);

          const payload = {
            studioId: STUDIO_ID,
            artistProfileId: ARTIST_ID,
            clientId: consultation.clientId,
            consultationId: consultation.id,
            durationMinutes: 120,
            placementMode: "OPEN_MAGNETIC",
            validFrom: validFrom.toISOString(),
            validUntil: validUntil.toISOString(),
            messageToClient,
          };

          const invite = await apiPost("/api/appointment-invites", payload);

          const bookingUrl = `${window.location.origin}/client/calendar?invite=${invite.token}`;

          window.alert(`Booking link created:\n${bookingUrl}`);

          await fetchConsultationsInRange();
        } catch (err) {
          console.error("Send booking link failed", err);
          alert(err?.response?.error || "Failed to create booking link");
        }
      }

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

                  const cellDate = new Date(year, month, dayNumber);
                  const isPastDay = cellDate < startOfToday();
                 const hasConsultAvailability =
                    !isPastDay &&
                    dayHasConsultationAvailability(cellDate);

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (isConsultationLaunch) {
                          if (isPastDay) return;
                          if (STAFF_ROLE !== "ARTIST" && !hasConsultAvailability) return;
                        }

                        handleDayClick(dayNumber);
                      }}
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
                            : isConsultationLaunch && isPastDay
                            ? "bg-neutral-950 text-neutral-700 cursor-not-allowed"
                            : hasConsultAvailability
                            ? "bg-emerald-950 border-emerald-700 hover:bg-emerald-900"
                            : isConsultationLaunch && STAFF_ROLE !== "ARTIST"
                            ? "bg-neutral-950 text-neutral-700 cursor-not-allowed"
                            : isToday
                            ? "bg-neutral-800"
                            : "bg-neutral-900 hover:bg-neutral-800"
                        }
                      `}
                    >
                      <div className="text-sm font-medium">
                        {dayNumber}
                      </div>
                       <div className="flex gap-1 flex-wrap">
                        {hasConsultAvailability && (
                          <span className="text-[10px] px-1 rounded bg-emerald-800 text-emerald-100">
                            Consult
                          </span>
                        )}
                      </div>
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
                          const clickedDate = new Date(dateObj);
                          clickedDate.setHours(0, 0, 0, 0);

                          if (isConsultationLaunch) {
                            if (clickedDate < startOfToday()) return;
                            if (STAFF_ROLE !== "ARTIST" && !dayHasConsultationAvailability(clickedDate)) {
                              return;
                            }

                            openConsultationPanel({
                              start: clickedDate,
                              slot: null,
                            });
                            return;
                          }

                          openDayPanel(clickedDate, { preserveLaunch: Boolean(launchIntent) });
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

                          const consultationSlotMatch = consultationSlots.find(
                            (slot) => slot.start.getTime() === slotStart.getTime()
                          );

                          const bookedConsultationInSlot = visibleConfirmedConsultations.find(
                            (c) =>
                              ["REQUESTED", "ACCEPTED"].includes(c.status) &&
                              overlaps(slotStart, slotEnd, c.start, c.end)
                          );  

                          const bookingInSlot = visibleBookings.find((b) =>
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
                                    : bookingInSlot
                                    ? "bg-blue-950 text-blue-200 hover:bg-blue-900"
                                    : bookedConsultationInSlot
                                    ? "bg-orange-950 text-orange-200 hover:bg-orange-900"
                                    : consultationSlotMatch
                                    ? "bg-emerald-950 text-emerald-200 hover:bg-emerald-900"
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
                                  <span className="text-[9px] px-1 rounded bg-blue-900 text-blue-100">
                                    Appointment
                                  </span>
                                )}

                                {!bookingInSlot && bookedConsultationInSlot && (
                                  <span className="text-[9px] px-1 rounded bg-orange-900 text-orange-100">
                                    Consultation
                                  </span>
                                )}

                                {!bookingInSlot && !bookedConsultationInSlot && consultationSlotMatch && (
                                  <span className="text-[9px] px-1 rounded bg-emerald-800 text-emerald-100">
                                    Open
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
                    {dayBookings.length === 0 &&
                     dayConfirmedConsultations.length === 0 &&
                     dayOpenConsultationPlaceholders.length === 0 ? (
                        <div className="text-sm text-neutral-400">No scheduled items yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {dayOpenConsultationPlaceholders.map((slot) => (
                          <div
                            key={slot.id}
                            className="rounded border border-emerald-800 bg-emerald-950/40 px-3 py-2"
                          >
                            <div className="text-xs text-emerald-300">
                              {slot.start.getHours()}:
                              {slot.start.getMinutes().toString().padStart(2, "0")}
                              {" – "}
                              {slot.end.getHours()}:
                              {slot.end.getMinutes().toString().padStart(2, "0")}
                            </div>

                            <div className="text-sm text-emerald-100 font-semibold">
                              Open Consultation
                            </div>
                          </div>
                        ))}
                        {dayConfirmedConsultations.map((c) => (
                          <div
                            key={c.id}
                            className="rounded border border-orange-800 bg-orange-950/40 px-3 py-3 space-y-3"
                          >
                            <div className="text-xs text-orange-300">
                              {c.start.getHours()}:
                              {c.start.getMinutes().toString().padStart(2, "0")}
                              {" – "}
                              {c.end.getHours()}:
                              {c.end.getMinutes().toString().padStart(2, "0")}
                            </div>

                            <div className="text-sm text-orange-100 font-semibold">
                              Consultation
                            </div>

                            <div className="text-xs text-orange-300 capitalize">
                              Status: {c.status}
                            </div>

                            {c.clientName && (
                              <div className="text-xs text-orange-200">
                                Client: {c.clientName}
                              </div>
                            )}

                            {c.description ? (
                              <div className="rounded border border-orange-900/60 bg-black/20 px-3 py-2">
                                <div className="text-[10px] uppercase tracking-wide text-orange-400">
                                  Request
                                </div>
                                <div className="mt-1 text-xs text-orange-100 whitespace-pre-wrap">
                                  {c.description}
                                </div>
                              </div>
                            ) : null}

                            {Array.isArray(c.imageRefs) && c.imageRefs.length > 0 ? (
                              <div className="rounded border border-orange-900/60 bg-black/20 px-3 py-2 space-y-2">
                                <div className="text-[10px] uppercase tracking-wide text-orange-400">
                                  Reference images
                                </div>

                                <div className="space-y-2">
                                  {c.imageRefs.map((img) => (
                                    <div
                                      key={img.id || img.name}
                                      className="rounded border border-orange-900/40 bg-orange-950/20 px-2 py-2"
                                    >
                                      <div className="text-xs text-orange-100 font-medium">
                                        {img.name || "Reference image"}
                                      </div>
                                      <div className="text-[11px] text-orange-300">
                                        Status: {img.status || "placeholder"}
                                      </div>
                                      <div className="text-[11px] text-orange-400 break-all">
                                        {img.url || "Upload placeholder — image link not added yet."}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {Array.isArray(c.messages) && c.messages.length > 0 ? (
                              <div className="rounded border border-orange-900/60 bg-black/20 px-3 py-2 space-y-2">
                                <div className="text-[10px] uppercase tracking-wide text-orange-400">
                                  Message history
                                </div>

                                <div className="space-y-2">
                                  {c.messages.map((msg, index) => (
                                    <div
                                      key={`${c.id}-msg-${index}`}
                                      className="rounded border border-orange-900/40 bg-orange-950/20 px-2 py-2"
                                    >
                                      <div className="text-[10px] text-orange-300 uppercase tracking-wide">
                                        {msg.sender} {msg.type ? `• ${msg.type}` : ""}
                                      </div>
                                      <div className="mt-1 text-xs text-orange-100 whitespace-pre-wrap">
                                        {msg.body}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {c.status === "REQUESTED" ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => approveConsultation(c.id)}
                                  className="rounded px-3 py-2 text-xs bg-emerald-800 text-emerald-100 hover:bg-emerald-700"
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  onClick={() => declineConsultation(c.id)}
                                  className="rounded px-3 py-2 text-xs bg-red-900 text-red-100 hover:bg-red-800"
                                >
                                  Decline
                                </button>
                              </div>
                            ) : c.status === "ACCEPTED" ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => sendBookingLinkForConsultation(c)}
                                  className="rounded px-3 py-2 text-xs bg-blue-900 text-blue-100 hover:bg-blue-800"
                                >
                                  Send Booking Link
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))}

                        {dayBookings.map((b) => (
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
                                  openAppointmentPanel({
                                    start: b.start,
                                    draft: {
                                      id: b.id,
                                      start: b.start,
                                      hours: Math.floor((b.end - b.start) / 3600000),
                                      minutes: ((b.end - b.start) % 3600000) / 60000,
                                      legalName: b.legalName || b.clientName || "",
                                      preferredName: b.preferredName || "",
                                      pronouns: "",
                                      phone: b.phone,
                                      email: b.email,
                                      service: b.service,
                                      notes: b.notes,
                                      isAdult: true,
                                      dateOfBirth: "",
                                      status: toUiStatus(b.status),
                                    },
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
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {sidebarMode === "consultation" && (
                  <div className="pt-4 border-t border-neutral-800 space-y-4">
                    <div className="text-sm text-neutral-400">
                      Consultation booking for{" "}
                      <span className="text-neutral-200 font-medium">
                        {consultationClient?.preferredName ||
                          consultationClient?.legalName ||
                          "Client"}
                      </span>
                    </div>

                    <div className="rounded border border-neutral-800 bg-neutral-950 px-3 py-3 space-y-3">
                      <div className="text-xs uppercase tracking-wide text-neutral-500">
                        Client information
                      </div>

                      <button
                      type="button"
                      onClick={() => {
                        resetClientContext();
                      }}
                      className="w-full px-3 py-2 text-xs rounded border border-neutral-800 bg-neutral-950 hover:bg-neutral-900"
                    >
                      Reset client form
                    </button>

                      <input
                        type="text"
                        placeholder="Legal name"
                        value={consultationClient.legalName}
                        onChange={(e) => {
                          clearConsultationClientSelection();
                          updateConsultationClientField("legalName", e.target.value);
                        }}
                        className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                      />

                      <input
                        type="text"
                        placeholder="Preferred name"
                        value={consultationClient.preferredName}
                        onChange={(e) => {
                          clearConsultationClientSelection();
                          updateConsultationClientField("preferredName", e.target.value);
                        }}
                        className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                      />

                      <select
                        value={consultationClient.pronouns || ""}
                        onChange={(e) => {
                          clearConsultationClientSelection();
                          updateConsultationClientField("pronouns", e.target.value);
                        }}
                        className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                      >
                        <option value="">Pronouns</option>
                        <option value="He / Him">He / Him</option>
                        <option value="She / Her">She / Her</option>
                        <option value="They / Them">They / Them</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Phone"
                        value={consultationClient.phone}
                        onChange={(e) => {
                          clearConsultationClientSelection();
                          updateConsultationClientField("phone", e.target.value);
                        }}
                        className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                      />

                      <input
                        type="email"
                        placeholder="Email"
                        value={consultationClient.email}
                        onChange={(e) => {
                          clearConsultationClientSelection();
                          updateConsultationClientField("email", e.target.value);
                        }}
                        className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                      />

                      <div className="flex items-center gap-3">
                        <label className="text-xs text-neutral-400">Over 18?</label>
                        <select
                          value={consultationClient.isAdult ? "yes" : "no"}
                          onChange={(e) => {
                            clearConsultationClientSelection();
                            updateConsultationClientField("isAdult", e.target.value === "yes");
                          }}
                          className="rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-100"
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      {!consultationClient.isAdult && (
                        <input
                          type="date"
                          value={consultationClient.dateOfBirth}
                          onChange={(e) => {
                            clearConsultationClientSelection();
                            updateConsultationClientField("dateOfBirth", e.target.value);
                          }}
                          className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                        />
                      )}

                      {consultationClient.selectedClientId ? (
                        <div className="text-xs text-emerald-300">
                          Existing client selected.
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-500">
                          Enter client details, then wire search/select or inline client resolution next.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-neutral-500">
                        {isManualConsultationDraft
                          ? "Artist-selected consultation time"
                          : "Available consultation slots"}
                      </div>

 {isManualConsultationDraft ? (
                        <div className="rounded border border-emerald-800 bg-emerald-950/30 px-3 py-3 space-y-2">
                          <div className="text-sm text-emerald-100 font-medium">
                            {selectedConsultationSlot.start.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                            {" – "}
                            {selectedConsultationSlot.end.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </div>

                          <div className="text-xs text-emerald-300">
                            Manual consultation time selected by artist.
                          </div>
                        </div>
                      ) : consultationLoading ? (
                        <div className="text-sm text-neutral-400">
                          Loading consultation slots...
                        </div>
                      ) : consultationError ? (
                        <div className="text-sm text-red-400">
                          {consultationError}
                        </div>
                      ) : consultationPanelSlots.length === 0 ? (
                        <div className="text-sm text-neutral-400">
                          No consultation slots for this day.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {consultationPanelSlots.map((slot) => {
                            const isSelected =
                              selectedConsultationSlot &&
                              selectedConsultationSlot.id === slot.id;

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => {
                                  if (slot.start < new Date()) return;
                                  setSelectedConsultationSlot(slot);
                                }}
                                className={`w-full rounded border px-3 py-2 text-left transition ${
                                  slot.start < new Date()
                                    ? "border-neutral-900 bg-neutral-950 text-neutral-600 cursor-not-allowed"
                                    : isSelected
                                    ? "border-neutral-500 bg-neutral-800"
                                    : "border-neutral-800 bg-neutral-950 hover:bg-neutral-900"
                                }`}
                              >
                                <div className="text-sm text-neutral-200 font-medium">
                                  {slot.start.toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                  {" – "}
                                  {slot.end.toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </div>

                                <div className="text-xs text-neutral-500">
                                  {slot.durationMinutes} min
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {selectedConsultationSlot && (
                      <div className="rounded border border-neutral-800 bg-neutral-950 px-3 py-3 space-y-3">
                        <div className="text-xs uppercase tracking-wide text-neutral-500">
                          {isManualConsultationDraft
                            ? "Selected consultation time"
                            : "Selected consultation slot"}
                        </div>

                        <div className="text-sm text-neutral-200 font-medium">
                          {selectedConsultationSlot.start.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {" – "}
                          {selectedConsultationSlot.end.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={createConsultationFromSelectedSlot}
                          disabled={consultationSubmitting}
                          className={`w-full px-3 py-2 text-xs rounded ${
                            consultationSubmitting
                              ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                              : "bg-emerald-800 text-emerald-100 hover:bg-emerald-700"
                          }`}
                        >
                          {consultationSubmitting
                            ? "Creating..."
                            : "Create Consultation"}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        openDayPanel(selectedDate || activeDate);
                      }}
                      className="w-full px-3 py-2 text-xs rounded bg-neutral-800 hover:bg-neutral-700"
                    >
                      Back
                    </button>
                  </div>
                )}
                {sidebarMode === "appointment" && bookingDraft && isSameDay(bookingDraft.start, activeDate) && (
                  <div className="pt-4 border-t border-neutral-800 space-y-4 transition-opacity duration-150">

                    <div className="text-sm text-neutral-400">
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                  openDayPanel(selectedDate || bookingDraft.start);
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
                      placeholder="Legal Name"
                      value={bookingDraft.legalName || ""}
                      onChange={(e) =>
                        setBookingDraft((prev) => ({
                          ...prev,
                          legalName: e.target.value,
                        }))
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                    />

                    <input
                      placeholder="Preferred Name"
                      value={bookingDraft.preferredName || ""}
                      onChange={(e) =>
                        setBookingDraft((prev) => ({
                          ...prev,
                          preferredName: e.target.value,
                        }))
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                    />

                    <select
                      value={bookingDraft.pronouns || ""}
                      onChange={(e) =>
                        setBookingDraft((prev) => ({
                          ...prev,
                          pronouns: e.target.value,
                        }))
                      }
                      className="w-full bg-neutral-800 border border-neutral-700 text-xs p-2 rounded"
                    >
                      <option value="">Pronouns</option>
                      <option value="He / Him">He / Him</option>
                      <option value="She / Her">She / Her</option>
                      <option value="They / Them">They / Them</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>

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
                                isAdult: bookingDraft.isAdult,
                            };

                            // If no selected clientId, send inline data
                            if (!bookingDraft.selectedClientId) {
                                payload.legalName = bookingDraft.legalName;
                                payload.preferredName = bookingDraft.preferredName;
                                payload.pronouns = bookingDraft.pronouns;
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

                                const isNewCreate = !bookingDraft.id;

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

                                // Clear client data after any successful new booking,
                                // or after finalized statuses on an existing appointment.
                                if (isNewCreate || isCompleted || isCancelled || isNoShow) {
                                  resetClientContext();
                                  clearCalendarLaunchState({ clearClient: true });
                                  openDayPanel(bookingDraft.start);
                                  return;
                                }

                                if (!bookingDraft.id && saved?._id) {
                                  setBookingDraft((prev) => ({
                                    ...prev,
                                    id: saved._id,
                                  }));
                                }
                            } catch (err) {
                                console.error("Create appointment failed", err);

                                const duplicate = err?.status === 409 && err?.response?.duplicate;
                                const existing = err?.response?.existingClient;

                                if (duplicate && existing) {
                                    const existingLabel =
                                        existing.preferredName ||
                                        existing.legalName ||
                                        existing.email ||
                                        existing.phoneE164 ||
                                        "existing client";

                                    const saveAnyway = window.confirm(
                                        `Client already exists as "${existingLabel}". Save anyway?`
                                    );

                                    if (saveAnyway) {
                                        const durationMs =
                                            bookingDraft.hours * 60 * 60000 +
                                            bookingDraft.minutes * 60000;

                                        const end = new Date(
                                            bookingDraft.start.getTime() + durationMs
                                        );

                                        const retryPayload = {
                                            studioId: STUDIO_ID,
                                            artistProfileId: ARTIST_ID,
                                            serviceId: SERVICE_ID,
                                            startsAt: bookingDraft.start.toISOString(),
                                            endsAt: end.toISOString(),
                                            status: toApiStatus(bookingDraft.status),
                                            notesInternal: bookingDraft.notes,
                                            legalName: bookingDraft.legalName,
                                            preferredName: bookingDraft.preferredName,
                                            pronouns: bookingDraft.pronouns,
                                            phone: bookingDraft.phone,
                                            email: bookingDraft.email,
                                            isAdult: bookingDraft.isAdult,
                                            forceCreate: true,
                                        };

                                        if (!bookingDraft.isAdult) {
                                            retryPayload.dateOfBirth = bookingDraft.dateOfBirth;
                                        }

                                        const saved = await apiPost("/api/staff/appointments", retryPayload);

                                        const rangeStart = new Date(year, month, 1, 0, 0, 0, 0);
                                        const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

                                        await fetchAppointmentsInRange(rangeStart, rangeEnd);

                                        resetClientContext();
                                        clearCalendarLaunchState({ clearClient: true });

                                        openDayPanel(bookingDraft.start);

                                        alert("Appointment created.");
                                        return;
                                    }

                                    return;
                                }

                                alert(err?.response?.error || "Booking failed");
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

                            openDayPanel(bookingDraft.start);
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
        {slotTypePicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <div className="w-full max-w-xs rounded border border-neutral-800 bg-neutral-950 p-4 space-y-4">
                <div className="text-sm font-semibold text-neutral-100">
                  Create from selected slot
                </div>

                <div className="text-xs text-neutral-400">
                  {slotTypePicker.start.toLocaleDateString("default", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {slotTypePicker.start.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>

                <div className="space-y-2">
                  {canCreateAppointments && (
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setSlotTypePickerSelection("appointment")}
                      className={`w-full rounded px-3 py-2 text-left text-sm ${
                        slotTypePickerSelection === "appointment"
                          ? "bg-blue-900 text-blue-100 border border-blue-700"
                          : "bg-neutral-900 text-neutral-200 border border-neutral-800"
                      }`}
                    >
                      Appointment
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSlotTypePickerSelection("consultation")}
                    disabled={
                      !slotTypePicker?.isConsultationPlaceholder &&
                      !canCreateManualConsultation
                    }
                    className={`w-full rounded px-3 py-2 text-left text-sm ${
                      slotTypePickerSelection === "consultation"
                        ? "bg-emerald-900 text-emerald-100 border border-emerald-700"
                        : "bg-neutral-900 text-neutral-200 border border-neutral-800"
                    } ${
                      !slotTypePicker?.isConsultationPlaceholder &&
                      !canCreateManualConsultation
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    Consultation
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        slotTypePickerSelection === "appointment" &&
                        slotTypePicker.isConsultationPlaceholder
                      ) {
                        const ok = window.confirm(
                          "Overwrite open consultation placeholder with an appointment?"
                        );
                        if (!ok) return;
                      }

                      if (slotTypePickerSelection === "appointment") {
                        openAppointmentDraft(slotTypePicker.start);
                      } else {
                        openConsultationDraftFromSlot(slotTypePicker.start);
                      }

                      closeSlotPicker();
                    }}
                    className="flex-1 rounded bg-neutral-800 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-700"
                  >
                    Continue
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeSlotPicker();
                    }}
                    className="flex-1 rounded bg-neutral-900 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
    );
}