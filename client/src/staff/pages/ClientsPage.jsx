import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiDelete } from "../../services/apiClient";

const PAGE_SIZE = 25;
const STUDIO_ID = "69936f65681b262ca3739f92";
const CALENDAR_LAUNCH_KEY = "studiovault_staff_calendar_launch_v1";

function formatPhone(phone) {
  if (!phone) return "—";

  const digits = String(phone).replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
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

function formatDate(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("default", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getDisplayName(client) {
  if (client?.preferredName?.trim()) return client.preferredName.trim();
  if (client?.legalName?.trim()) return client.legalName.trim();
  return "Unnamed client";
}

export default function ClientsPage() {
  const navigate = useNavigate();

  const listRef = useRef(null);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const [selectedClientId, setSelectedClientId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [isNewClientMode, setIsNewClientMode] = useState(false);
  const [isNewClientSaved, setIsNewClientSaved] = useState(false);
  const [newClientDraft, setNewClientDraft] = useState({
    legalName: "",
    preferredName: "",
    pronouns: "",
    pronounsCustom: "",
    email: "",
    phoneE164: "",
    isAdult: true,
    dateOfBirth: "",
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [duplicateCandidate, setDuplicateCandidate] = useState(null);
  const [duplicateCandidateId, setDuplicateCandidateId] = useState(null);

  const [, setEditClientOpen] = useState(false);
  const [, setBlockClientOpen] = useState(false);

  function getResolvedPronounsValue(draft = newClientDraft) {
    if (draft.pronouns === "other") {
      return (draft.pronounsCustom || "").trim();
    }

    if (draft.pronouns === "prefer_not_to_say") {
      return "Prefer not to say";
    }

    if (draft.pronouns === "he_him") {
      return "He / Him";
    }

    if (draft.pronouns === "she_her") {
      return "She / Her";
    }

    if (draft.pronouns === "they_them") {
      return "They / Them";
    }

    return "";
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let ignore = false;

    async function loadFirstPage() {
      try {
        setIsInitialLoading(true);
        setError("");

        const params = new URLSearchParams({
          studioId: STUDIO_ID,
          page: "1",
          limit: String(PAGE_SIZE),
        });

        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }

        const data = await apiGet(`/api/client/staff-directory?${params.toString()}`);

        if (ignore) return;

        const nextItems = Array.isArray(data.items) ? data.items : [];

        setItems(nextItems);
        setPage(data.page || 1);
        setHasMore(Boolean(data.hasMore));
        setTotal(Number(data.total || 0));

        if (!nextItems.length) {
          setSelectedClientId(null);
          setDetail(null);
          return;
        }

        setSelectedClientId((prev) => {
          const stillExists = nextItems.some((item) => item._id === prev);
          return stillExists ? prev : null;
        });
      } catch (err) {
        if (ignore) return;
        setError(err?.message || "Failed to load clients");
        setItems([]);
        setPage(1);
        setHasMore(false);
        setTotal(0);
        setSelectedClientId(null);
        setDetail(null);
      } finally {
        if (!ignore) {
          setIsInitialLoading(false);
        }
      }
    }

    loadFirstPage();

    return () => {
      ignore = true;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    let ignore = false;

    async function loadDetail() {
      if (!selectedClientId) {
        setDetail(null);
        return;
      }

      try {
        setIsDetailLoading(true);
        setDetailError("");

        const params = new URLSearchParams({
          studioId: STUDIO_ID,
        });

        const data = await apiGet(
          `/api/client/staff-directory/${selectedClientId}?${params.toString()}`
        );

        if (ignore) return;

        setDetail(data);
      } catch (err) {
        if (ignore) return;
        setDetail(null);
        setDetailError(err?.message || "Failed to load client detail");
      } finally {
        if (!ignore) {
          setIsDetailLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      ignore = true;
    };
  }, [selectedClientId]);

  async function handleLoadMore() {
    try {
      setIsLoadingMore(true);
      setError("");

      const nextPage = page + 1;

      const params = new URLSearchParams({
        studioId: STUDIO_ID,
        page: String(nextPage),
        limit: String(PAGE_SIZE),
      });

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const data = await apiGet(`/api/client/staff-directory?${params.toString()}`);

      setItems((prev) => [...prev, ...(Array.isArray(data.items) ? data.items : [])]);
      setPage(data.page || nextPage);
      setHasMore(Boolean(data.hasMore));
      setTotal(Number(data.total || 0));
    } catch (err) {
      setError(err?.message || "Failed to load more clients");
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleRemoveClient() {
    if (!detail?.client?._id) return;

    if (!confirm("Remove this client from studio?")) return;

    await apiDelete(
      `/api/client/staff-directory/${detail.client._id}?studioId=${STUDIO_ID}`
    );

    setSelectedClientId(null);
    setDetail(null);

    setItems((prev) =>
      prev.filter((c) => c._id !== detail.client._id)
    );
  }

  function openClient(client) {
    setIsNewClientMode(false);
    setSelectedClientId(client._id);
  }

  function handleBookAppointment() {
    if (!detail?.client) return;

    navigate("/staff/calendar", {
      state: {
        calendarLaunch: {
          type: "appointment_prefill",
          selectedClientId: detail.client._id,
          clientName: detail.client.legalName || "",
          preferredName: detail.client.preferredName || "",
          pronouns: detail.client.pronouns || "",
          email: detail.client.email || "",
          phone: detail.client.phoneE164 || "",
          isAdult: detail.client.isAdult === true,
          dateOfBirth: detail.client.dateOfBirth || "",
        },
      },
    });
  }

  function handleBookConsultation() {
    if (!detail?.client) return;

    navigate("/staff/calendar", {
      state: {
        calendarLaunch: {
          type: "consultation_prefill",
          selectedClientId: detail.client._id,
          clientName: detail.client.legalName || "",
          preferredName: detail.client.preferredName || "",
          pronouns: detail.client.pronouns || "",
          email: detail.client.email || "",
          phone: detail.client.phoneE164 || "",
          isAdult: detail.client.isAdult === true,
          dateOfBirth: detail.client.dateOfBirth || "",
        },
      },
    });
  }

  function handleNewClient() {
    setIsNewClientMode(true);
    setSelectedClientId(null);
    setDetail(null);
    setIsNewClientSaved(false);
    setSaveMessage("");
    setDuplicateCandidate(null);
    setDuplicateCandidateId(null);

    setNewClientDraft({
      legalName: "",
      preferredName: "",
      pronouns: "",
      pronounsCustom: "",
      email: "",
      phoneE164: "",
      isAdult: true,
      dateOfBirth: "",
    });

    localStorage.removeItem(CALENDAR_LAUNCH_KEY);
  }

  async function handleSaveNewClient(duplicateAction = null) {
    const hasName =
      (newClientDraft.legalName || "").trim().length > 0 ||
      (newClientDraft.preferredName || "").trim().length > 0;

    const hasContact =
      (newClientDraft.email || "").trim().length > 0 ||
      (newClientDraft.phoneE164 || "").trim().length > 0;

    if (!hasName) {
      alert("Enter at least a legal name or preferred name before saving.");
      return;
    }

    if (!hasContact) {
      alert("Enter at least an email or phone number before saving.");
      return;
    }

    if (!newClientDraft.isAdult && !newClientDraft.dateOfBirth) {
      alert("Date of birth is required for minors.");
      return;
    }

    if (
      newClientDraft.pronouns === "other" &&
      !(newClientDraft.pronounsCustom || "").trim()
    ) {
      alert("Enter pronouns or choose a listed option.");
      return;
    }

    const resolvedPronouns = getResolvedPronounsValue(newClientDraft);

    const payload = {
      studioId: STUDIO_ID,
      legalName: (newClientDraft.legalName || "").trim(),
      preferredName: (newClientDraft.preferredName || "").trim(),
      pronouns: resolvedPronouns,
      email: (newClientDraft.email || "").trim(),
      phoneE164: (newClientDraft.phoneE164 || "").trim(),
      isAdult: newClientDraft.isAdult === true,
      dateOfBirth: newClientDraft.isAdult ? "" : (newClientDraft.dateOfBirth || ""),
      duplicateAction,
    };

    try {
      setIsSavingClient(true);
      setSaveMessage("");
      setDuplicateCandidate(null);

      const res = await apiPost("/api/client/staff-directory", payload);
      const savedClient = res?.client;

      if (!savedClient?._id) {
        alert("Client save failed.");
        return;
      }

      setIsNewClientSaved(true);
      setSelectedClientId(savedClient._id);
      setIsNewClientMode(false);

      if (res?.duplicate === true && duplicateAction === "use_existing") {
        setSaveMessage("Existing client selected.");
      } else if (res?.duplicate === true && duplicateAction === "create_new") {
        setSaveMessage("New client saved despite duplicate contact match.");
      } else {
        setSaveMessage("Client saved.");
      }

      setNewClientDraft({
        legalName: savedClient.legalName || "",
        preferredName: savedClient.preferredName || "",
        pronouns:
          savedClient.pronouns === "He / Him"
            ? "he_him"
            : savedClient.pronouns === "She / Her"
            ? "she_her"
            : savedClient.pronouns === "They / Them"
            ? "they_them"
            : savedClient.pronouns === "Prefer not to say"
            ? "prefer_not_to_say"
            : savedClient.pronouns
            ? "other"
            : "",
        pronounsCustom:
          savedClient.pronouns &&
          !["He / Him", "She / Her", "They / Them", "Prefer not to say"].includes(savedClient.pronouns)
            ? savedClient.pronouns
            : "",
        email: savedClient.email || "",
        phoneE164: savedClient.phoneE164 || "",
        isAdult: savedClient.isAdult === true,
        dateOfBirth: savedClient.dateOfBirth || "",
      });

      const params = new URLSearchParams({
        studioId: STUDIO_ID,
        page: "1",
        limit: String(PAGE_SIZE),
      });

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const listData = await apiGet(`/api/client/staff-directory?${params.toString()}`);
      const nextItems = Array.isArray(listData.items) ? listData.items : [];

      setItems(nextItems);
      setPage(listData.page || 1);
      setHasMore(Boolean(listData.hasMore));
      setTotal(Number(listData.total || 0));

      const detailParams = new URLSearchParams({
        studioId: STUDIO_ID,
      });

      const detailData = await apiGet(
        `/api/client/staff-directory/${savedClient._id}?${detailParams.toString()}`
      );

      setDetail(detailData);
      setDuplicateCandidateId(null); 

      setTimeout(() => {
        const el = document.getElementById(`client-row-${savedClient._id}`);
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 50);     
    } catch (err) {
      console.error("Save client failed", err);

      const duplicateData = err?.response;

      if (duplicateData?.duplicate && duplicateData?.client?._id) {
        setDuplicateCandidate(duplicateData.client);
        setDuplicateCandidateId(duplicateData.client._id);

        setTimeout(() => {
          const el = document.getElementById(`client-row-${duplicateData.client._id}`);
          el?.scrollIntoView({ block: "center", behavior: "smooth"});
        }, 50);

        return;
      }

      alert(err?.response?.error || err?.message || "Failed to save client");
    } finally {
      setIsSavingClient(false);
    }
  }

  function updateNewClientDraft(field, value) {
    setIsNewClientSaved(false);
    setSaveMessage("");
    setDuplicateCandidate(null);
    setDuplicateCandidateId(null);

    setNewClientDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  const resultsLabel = useMemo(() => {
    if (debouncedSearch) {
      return `${total} matching client${total === 1 ? "" : "s"}`;
    }

    return `${total} client${total === 1 ? "" : "s"}`;
  }, [debouncedSearch, total]);

  const actingRole = detail?.actingRole || "ARTIST";
  const showArtistAppointmentButton = actingRole === "ARTIST";

  return (
    <div className="grid min-h-full gap-4 p-4 lg:grid-cols-[minmax(320px,420px)_1fr] lg:p-6">
      <div className="flex min-h-0 flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">Clients</h1>
            <p className="text-sm text-zinc-400">
              Search by name, email, or phone number.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleNewClient}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
            >
              New Client
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <label htmlFor="client-search" className="mb-2 block text-sm text-zinc-300">
              Search clients
            </label>
            <input
              id="client-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email, or phone"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
            />
          </div>

          <div className="text-sm text-zinc-400">{resultsLabel}</div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {isInitialLoading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
            Loading clients...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm text-zinc-400">
            {debouncedSearch
              ? "No clients matched your search."
              : "No clients are available for this studio yet."}
          </div>
        ) : (
          <>
            <div
              ref={listRef}
              className="max-h-[70vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/70"
            >
              <div className="divide-y divide-zinc-800">
                {items.map((client) => {
                  const isSelected = client._id === selectedClientId;
                  const isDuplicateMatch = client._id === duplicateCandidateId;

                  return (
                    <button
                      id={`client-row-${client._id}`}
                      key={client._id}
                      type="button"
                      onClick={() => openClient(client)}
                      className={`flex w-full flex-col gap-2 p-4 text-left transition sm:flex-row sm:items-start sm:justify-between ${
                        isSelected
                          ? "bg-zinc-800/80"
                          : isDuplicateMatch
                          ? "bg-red-950/30 ring-1 ring-inset ring-red-800/60"
                          : "bg-transparent hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-base font-medium text-zinc-100">
                          {getDisplayName(client)}
                        </div>

                        {client.legalName &&
                        client.preferredName &&
                        client.legalName !== client.preferredName ? (
                          <div className="truncate text-sm text-zinc-400">
                            Legal: {client.legalName}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-1 text-sm text-zinc-300 sm:text-right">
                        <div className="break-all">{client.email || "—"}</div>
                        <div>{formatPhone(client.phoneE164)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {hasMore ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="min-h-0">
        {isDetailLoading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm text-zinc-300">
            Loading client detail...
          </div>
        ) : detailError ? (
          <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">
            {detailError}
          </div>
        ) : isNewClientMode ? (
          <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">New Client</h2>
                <p className="text-sm text-zinc-400">
                  Enter client information, save the client, then choose how to book.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Legal name"
                  value={newClientDraft.legalName}
                  onChange={(e) => updateNewClientDraft("legalName", e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
                />

                <input
                  type="text"
                  placeholder="Preferred name"
                  value={newClientDraft.preferredName}
                  onChange={(e) => updateNewClientDraft("preferredName", e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
                />

                <select
                  value={newClientDraft.pronouns}
                  onChange={(e) => updateNewClientDraft("pronouns", e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
                >
                  <option value="">Pronouns</option>
                  <option value="he_him">He / Him</option>
                  <option value="she_her">She / Her</option>
                  <option value="they_them">They / Them</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                
                {newClientDraft.pronouns === "other" ? (
                  <input
                    type="text"
                    placeholder="Enter pronouns"
                    value={newClientDraft.pronounsCustom}
                    onChange={(e) => updateNewClientDraft("pronounsCustom", e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
                  />
                ) : null}

                <input
                  type="email"
                  placeholder="Email"
                  value={newClientDraft.email}
                  onChange={(e) => updateNewClientDraft("email", e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
                />

                <input
                  type="text"
                  placeholder="Phone"
                  value={newClientDraft.phoneE164}
                  onChange={(e) => updateNewClientDraft("phoneE164", e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
                />

                <select
                  value={newClientDraft.isAdult ? "yes" : "no"}
                  onChange={(e) => updateNewClientDraft("isAdult", e.target.value === "yes")}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"
                >
                  <option value="yes">Over 18</option>
                  <option value="no">Minor</option>
                </select>

                {!newClientDraft.isAdult ? (
                  <input
                    type="date"
                    value={newClientDraft.dateOfBirth}
                    onChange={(e) => updateNewClientDraft("dateOfBirth", e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 sm:col-span-2"
                  />
                ) : null}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveNewClient(null)}
                    disabled={isSavingClient || Boolean(duplicateCandidate)}
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingClient ? "Saving..." : isNewClientSaved ? "Saved" : "Save Client"}
                  </button>
                </div>

                {saveMessage ? (
                  <div className="text-sm text-emerald-300">
                    {saveMessage} Use the booking options from the saved client panel.
                  </div>
                ) : null}

                {duplicateCandidate ? (
                  <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-100">
                    <div className="font-medium">
                      Possible duplicate or account conflict detected.
                    </div>

                    <div className="mt-2 text-red-200/90">
                      This email or phone number already belongs to:
                      <span className="font-medium"> "{getDisplayName(duplicateCandidate)}"</span>
                    </div>

                    <div className="mt-2 text-red-200/90">
                      {duplicateCandidate.email || "—"} • {formatPhone(duplicateCandidate.phoneE164)}
                    </div>

                    <div className="mt-3 text-red-200/80">
                      Review this match before continuing. This may indicate a duplicate profile,
                      an account access problem, or an attempt to bypass a blocked or flagged record.
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDuplicateCandidate(null);
                          handleSaveNewClient("use_existing");
                        }}
                        disabled={isSavingClient}
                        className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingClient ? "Saving..." : "Use Existing Client"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDuplicateCandidate(null);
                          handleSaveNewClient("create_new");
                        }}
                        disabled={isSavingClient}
                        className="rounded-xl border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-100 hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingClient ? "Saving..." : "Create New Client Anyway"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDuplicateCandidate(null);
                          setDuplicateCandidateId(null);
                        }}
                        disabled={isSavingClient}
                        className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400">
              {duplicateCandidate
                ? "Review the duplicate warning before continuing."
                : isNewClientSaved
                ? "Client saved. You can now continue to booking."
                : "Save the client before continuing to booking."}
            </div>
          </div>
        ) : !detail ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm text-zinc-400">
            Select a client or click New Client.
          </div>
        ) : (
          <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">
                  {getDisplayName(detail.client)}
                </h2>
                <p className="text-sm text-zinc-400">
                  Studio-scoped client record
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleBookConsultation}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
                >
                  Book Consultation
                </button>

                {showArtistAppointmentButton ? (
                  <button
                    type="button"
                    onClick={handleBookAppointment}
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
                  >
                    Book Appointment
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setEditClientOpen(true)}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
                >
                  Edit User
                </button>

                <button
                  type="button"
                  onClick={handleRemoveClient}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
                >
                  Remove User
                </button>

                <button
                  type="button"
                  onClick={() => setBlockClientOpen(true)}
                  className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200 hover:bg-red-900/40"
                >
                  Block User
                </button>
              </div>
            </div>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">
                  Profile
                </h3>

                <div className="grid gap-2 text-sm">
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Legal:</span>{" "}
                    {detail.client.legalName || "—"}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Preferred:</span>{" "}
                    {detail.client.preferredName || "—"}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Pronouns:</span>{" "}
                    {detail.client.pronouns || "—"}
                  </div>
                  <div className="break-all text-zinc-300">
                    <span className="text-zinc-500">Email:</span>{" "}
                    {detail.client.email || "—"}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Phone:</span>{" "}
                    {formatPhone(detail.client.phoneE164)}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Adult:</span>{" "}
                    {detail.client.isAdult ? "Yes" : "No"}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">DOB:</span>{" "}
                    {formatDate(detail.client.dateOfBirth)}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Onboarding:</span>{" "}
                    {detail.client.hasCompletedOnboarding ? "Complete" : "Incomplete"}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Client status:</span>{" "}
                    {detail.client.status || "active"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">
                  Studio Relationship
                </h3>

                <div className="grid gap-2 text-sm">
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Studio status:</span>{" "}
                    {detail.studioLink.status || "active"}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Last booked:</span>{" "}
                    {formatDateTime(detail.studioLink.lastBookedAt)}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Linked:</span>{" "}
                    {formatDateTime(detail.studioLink.createdAt)}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Operational notes:</span>{" "}
                    {detail.studioLink.notesOperational || "—"}
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Acting role:</span>{" "}
                    {actingRole || "—"}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">
                Appointments
              </h3>

              {detail.appointments.length === 0 ? (
                <div className="text-sm text-zinc-500">No appointments yet.</div>
              ) : (
                <div className="space-y-3">
                  {detail.appointments.map((appt) => (
                    <div
                      key={appt._id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3"
                    >
                      <div className="text-sm font-medium text-zinc-100">
                        {appt.serviceName || "Appointment"}
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {formatDateTime(appt.startsAt)} — {formatDateTime(appt.endsAt)}
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        Status: {appt.status || "BOOKED"}
                      </div>
                      {appt.notesInternal ? (
                        <div className="mt-2 border-t border-zinc-800 pt-2 text-xs text-zinc-500">
                          {appt.notesInternal}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">
                Consultations
              </h3>

              {detail.consultations.length === 0 ? (
                <div className="text-sm text-zinc-500">No consultations yet.</div>
              ) : (
                <div className="space-y-3">
                  {detail.consultations.map((consult) => (
                    <div
                      key={consult._id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3"
                    >
                      <div className="text-sm font-medium text-zinc-100">
                        Consultation
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {formatDateTime(consult.startsAt)}
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        Status: {consult.status || "REQUESTED"}
                      </div>
                      {consult.description ? (
                        <div className="mt-2 border-t border-zinc-800 pt-2 text-xs text-zinc-500">
                          {consult.description}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}