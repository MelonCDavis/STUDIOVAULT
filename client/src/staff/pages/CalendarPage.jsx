import { useState, useEffect, useRef } from "react";

function getDaysInMonth(year, month) {
    return new Date(year, month +1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(
        new Date(today.getFullYear(), today.getMonth(), 1)
    );

    const [selectedDate, setSelectedDate] = useState(null);
    const [viewMode, setViewMode] = useState("month");

    const [focusedSlot, setFocusedSlot] = useState(null);
    const [pendingBooking, setPendingBooking] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthLabel = currentDate.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });

    const goPrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goNextMonth = ()=> {
        setCurrentDate(new Date(year, month +1,1));
    };

    const handleDayClick = (dayNumber) => {
        setSelectedDate(new Date(year, month, dayNumber));
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

    const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i
    );

    const weekScrollRef = useRef(null);

    const handleTimeSlotClick = (dateObj, hour) => {
      const newDate = new Date(dateObj);
      newDate.setHours(hour, 0, 0, 0);
      setFocusedSlot(newDate);
    };

    const activeDate = focusedSlot || selectedDate;

    useEffect(() => {
        if (viewMode === "week" && weekScrollRef.current) {
          const slotHeight = 64; 
          const defaultHour = 12;
          const scrollTo = (defaultHour - START_HOUR) * slotHeight;

          weekScrollRef.current.scrollTop = scrollTo;
        }
    }, [viewMode]);

    return (
        <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <button
                  onClick={goPrevMonth}
                  className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700">
                    Prev
                </button>
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold">
                    {monthLabel}
                  </h2>

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
                  onClick={goNextMonth}
                  className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700">
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
                        onClick={() => setSelectedDate(dateObj)}
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
                        {hours.map((hour) => {
                          const isSelectedHour =
                            focusedSlot &&
                            focusedSlot.getHours() === hour &&
                            dateObj.toDateString() === focusedSlot.toDateString();

                          return (
                            <div
                              key={hour}
                              onClick={() => handleTimeSlotClick(dateObj, hour)}
                              className={`
                                h-16
                                px-2
                                text-xs
                                flex
                                items-start
                                cursor-pointer
                                transition
                                ${
                                  isSelectedHour
                                    ? "bg-neutral-700 text-neutral-200"
                                    : "text-neutral-500 hover:bg-neutral-800"
                                }
                              `}
                            >
                              {hour}:00
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
                <div className="border-t border-neutral-800 pt-4 text-sm text-neutral-400">
                  No bookings yet.
                </div>
              </div> 
            )}
        </div>
    );
}