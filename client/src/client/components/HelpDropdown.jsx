export default function HelpDropdown({ onSelect, disabled }) {
  return (
    <select
      disabled={disabled}
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) onSelect(e.target.value);
      }}
      className="w-full rounded-xl border border-neutral-700 bg-neutral-950/60 px-4 py-3 text-sm"
    >
      <option value="" disabled>
        Choose an option...
      </option>

      <option value="service-intake">Check In / Service Forms</option>

      <option value="consultations">Request Consultation</option>
      <option value="upcoming">View Upcoming</option>
      <option value="messages">Messages</option>
      <option value="documents">Documents</option>
      <option value="profile">Update Profile</option>
    </select>
  );
}