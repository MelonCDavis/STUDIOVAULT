import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export default function ProfilePanel({ onComplete }) {
  const { token } = useAuth();

  const [form, setForm] = useState({
    legalName: "",
    preferredName: "",
    pronouns: "",
    phoneE164: "",
    dateOfBirth: "",
    isAdult: false,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (
      !form.legalName.trim() ||
      !form.preferredName.trim() ||
      !form.phoneE164.trim() ||
      !form.dateOfBirth ||
      form.isAdult !== true
    ) {
      setError("Please complete all required fields and confirm you are 18+.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/api/client/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error("Failed to save profile");
      }

      onComplete();
    } catch (err) {
      setError("Could not save your profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Complete Your Profile</h2>
        <p className="text-sm text-neutral-400">
          Please complete your profile before continuing.
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          name="legalName"
          placeholder="Legal Name"
          value={form.legalName}
          onChange={handleChange}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />

        <input
          type="text"
          name="preferredName"
          placeholder="Preferred Name"
          value={form.preferredName}
          onChange={handleChange}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />

        <select
          name="pronouns"
          value={form.pronouns}
          onChange={handleChange}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-500"
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
          name="phoneE164"
          placeholder="Phone (+15551234567)"
          value={form.phoneE164}
          onChange={handleChange}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />

        <input
          type="date"
          name="dateOfBirth"
          value={form.dateOfBirth}
          onChange={handleChange}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />

        <label className="flex items-center gap-2 text-sm text-neutral-200">
          <input
            type="checkbox"
            name="isAdult"
            checked={form.isAdult}
            onChange={handleChange}
          />
          I confirm that I am 18 or older
        </label>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}