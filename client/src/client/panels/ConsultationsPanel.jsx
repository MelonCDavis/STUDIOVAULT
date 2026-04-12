import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../services/apiClient";

const STUDIO_ID = "REPLACE_WITH_REAL_STUDIO_ID"; // temp until wired
const ARTIST_PROFILE_ID = "REPLACE_WITH_ARTIST_ID"; // temp until wired

export default function ConsultationsPanel() {
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [travelInfo, setTravelInfo] = useState("");
  const [budget, setBudget] = useState("");

  const [imageRefs, setImageRefs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [consultations, setConsultations] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  function addImagePlaceholder() {
    setImageRefs((prev) => [
      ...prev,
      {
        id: `placeholder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: "",
        url: "",
        status: "placeholder",
      },
    ]);
  }

  function updateImageRef(id, field, value) {
    setImageRefs((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, [field]: value } : img
      )
    );
  }

  function removeImageRef(id) {
    setImageRefs((prev) => prev.filter((img) => img.id !== id));
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

async function loadConsultationHistory() {
  try {
    setIsLoadingHistory(true);
    setHistoryError("");

    const data = await apiGet("/api/client/consultations");
    setConsultations(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Load consultations failed", err);
    setConsultations([]);
    setHistoryError(err?.response?.error || "Failed to load consultations");
  } finally {
    setIsLoadingHistory(false);
  }
}

useEffect(() => {
  loadConsultationHistory();
}, []);

  async function handleSubmit() {
    if (!description.trim()) {
      alert("Please enter a description for your request.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        studioId: STUDIO_ID,
        artistProfileId: ARTIST_PROFILE_ID,
        startsAt: new Date().toISOString(), // temp until slot picker is wired
        description,
        preferredDate,
        travelInfo,
        budget,
        imageRefs: imageRefs.filter(
          (img) => (img.name || "").trim() || (img.url || "").trim()
        ),
      };

      await apiPost("/api/client/consultations/request", payload);

      // reset form
      setDescription("");
      setPreferredDate("");
      setTravelInfo("");
      setBudget("");
      setImageRefs([]);

      await loadConsultationHistory();

      alert("Consultation request submitted.");
    } catch (err) {
      console.error("Submit consultation failed", err);
      alert(err?.response?.error || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Consultations</h2>
        <p className="text-sm text-neutral-400">
          Submit a request and share your ideas with your artist.
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm text-neutral-300">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950/60 px-4 py-3 text-sm"
          placeholder="Describe your idea, placement, size, style..."
        />
      </div>

      {/* Preferred Date */}
      <div className="space-y-2">
        <label className="text-sm text-neutral-300">Preferred Date</label>
        <input
          type="text"
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950/60 px-4 py-3 text-sm"
          placeholder="Any preferred dates or timeframe"
        />
      </div>

      {/* Travel Info */}
      <div className="space-y-2">
        <label className="text-sm text-neutral-300">Travel Info</label>
        <input
          type="text"
          value={travelInfo}
          onChange={(e) => setTravelInfo(e.target.value)}
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950/60 px-4 py-3 text-sm"
          placeholder="Traveling from out of town? Let us know."
        />
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <label className="text-sm text-neutral-300">Budget</label>
        <input
          type="text"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950/60 px-4 py-3 text-sm"
          placeholder="Optional budget range"
        />
      </div>

      {/* Image References */}
      <div className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-neutral-300">
            Reference Images
          </label>
          <button
            type="button"
            onClick={addImagePlaceholder}
            className="text-xs text-blue-400 hover:underline"
          >
            + Add Image
          </button>
        </div>

        {imageRefs.length === 0 ? (
          <div className="text-xs text-neutral-500">
            No reference images added.
          </div>
        ) : (
          <div className="space-y-3">
            {imageRefs.map((img) => (
              <div
                key={img.id}
                className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 space-y-2"
              >
                <input
                  type="text"
                  value={img.name}
                  onChange={(e) =>
                    updateImageRef(img.id, "name", e.target.value)
                  }
                  placeholder="Image name (e.g. sleeve reference)"
                  className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
                />

                <input
                  type="text"
                  value={img.url}
                  onChange={(e) =>
                    updateImageRef(img.id, "url", e.target.value)
                  }
                  placeholder="Image URL (placeholder for now)"
                  className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
                />

                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-neutral-500">
                    Status: {img.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeImageRef(img.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full rounded-xl bg-neutral-800 px-4 py-3 text-sm text-white hover:bg-neutral-700 disabled:opacity-60"
      >
        {isSubmitting ? "Submitting..." : "Submit Consultation Request"}
      </button>
      <div className="space-y-3">
      <div className="text-sm font-medium text-neutral-200">
        Consultation History
      </div>

      {isLoadingHistory ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 text-sm text-neutral-400">
          Loading consultations...
        </div>
      ) : historyError ? (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">
          {historyError}
        </div>
      ) : consultations.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 text-sm text-neutral-400">
          No consultation requests yet.
        </div>
      ) : (
        <div className="space-y-4">
          {consultations.map((consultation) => (
            <div
              key={consultation._id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-4"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium text-neutral-100">
                  Consultation Request
                </div>
                <div className="text-xs uppercase tracking-wide text-neutral-400">
                  {consultation.status || "REQUESTED"}
                </div>
              </div>

              <div className="text-xs text-neutral-400">
                Starts: {formatDateTime(consultation.startsAt)}
              </div>

              {consultation.intake?.description ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                    Request
                  </div>
                  <div className="mt-1 text-sm text-neutral-200 whitespace-pre-wrap">
                    {consultation.intake.description}
                  </div>
                </div>
              ) : null}

              {Array.isArray(consultation.intake?.imageRefs) &&
              consultation.intake.imageRefs.length > 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                    Reference Images
                  </div>

                  {consultation.intake.imageRefs.map((img) => (
                    <div
                      key={img.id || img.name}
                      className="rounded border border-neutral-800 bg-neutral-900/60 px-2 py-2"
                    >
                      <div className="text-xs text-neutral-200 font-medium">
                        {img.name || "Reference image"}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Status: {img.status || "placeholder"}
                      </div>
                      <div className="text-[11px] text-neutral-500 break-all">
                        {img.url || "Image placeholder — no link added yet."}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {Array.isArray(consultation.messages) && consultation.messages.length > 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                    Message History
                  </div>

                  {consultation.messages.map((msg, index) => (
                    <div
                      key={`${consultation._id}-msg-${index}`}
                      className="rounded border border-neutral-800 bg-neutral-900/60 px-2 py-2"
                    >
                      <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                        {msg.sender} {msg.type ? `• ${msg.type}` : ""}
                      </div>
                      <div className="mt-1 text-xs text-neutral-200 whitespace-pre-wrap">
                        {msg.body}
                      </div>
                      {msg.createdAt ? (
                        <div className="mt-1 text-[10px] text-neutral-500">
                          {formatDateTime(msg.createdAt)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}