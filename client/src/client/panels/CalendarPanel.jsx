export default function CalendarPanel({ evaluationAppointmentId }) {
  return (
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
  );
}