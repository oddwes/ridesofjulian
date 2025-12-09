"use client";

import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

export const DatePicker = ({ value, onChange, onClose }: DatePickerProps) => {
  const [currentMonth, setCurrentMonth] = useState(value ? dayjs(value) : dayjs());
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setCurrentMonth(dayjs(value));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const startOfMonth = currentMonth.startOf("month");
  const endOfMonth = currentMonth.endOf("month");
  const startOfCalendar = startOfMonth.startOf("week");
  const endOfCalendar = endOfMonth.endOf("week");

  const days: dayjs.Dayjs[] = [];
  let day = startOfCalendar;
  while (day.isBefore(endOfCalendar) || day.isSame(endOfCalendar, "day")) {
    days.push(day);
    day = day.add(1, "day");
  }

  const handleDateClick = (date: dayjs.Dayjs) => {
    onChange(date.format("YYYY-MM-DD"));
    onClose();
  };

  const handleToday = () => {
    const today = dayjs();
    onChange(today.format("YYYY-MM-DD"));
    setCurrentMonth(today);
    onClose();
  };

  const handleClear = () => {
    onChange("");
    onClose();
  };

  return (
    <div
      ref={pickerRef}
      className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-4 min-w-[280px]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))}
            className="p-1 hover:bg-slate-700 rounded"
          >
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-100">
            {currentMonth.format("MMMM YYYY")}
          </span>
          <button
            onClick={() => setCurrentMonth(currentMonth.add(1, "month"))}
            className="p-1 hover:bg-slate-700 rounded"
          >
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
          <div key={idx} className="text-center text-xs font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const isCurrentMonth = day.month() === currentMonth.month();
          const isSelected = value && day.format("YYYY-MM-DD") === value;
          const isToday = day.format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");

          return (
            <button
              key={idx}
              onClick={() => handleDateClick(day)}
              className={`
                aspect-square text-sm rounded
                ${!isCurrentMonth ? "text-gray-600" : "text-gray-100"}
                ${isSelected ? "bg-blue-600 text-white" : "hover:bg-slate-700"}
                ${isToday && !isSelected ? "border border-blue-500" : ""}
              `}
            >
              {day.date()}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between mt-4 pt-4 border-t border-slate-700">
        <button
          onClick={handleClear}
          className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
        >
          Clear
        </button>
        <button
          onClick={handleToday}
          className="px-3 py-1 text-sm text-blue-400 hover:text-blue-300"
        >
          Today
        </button>
      </div>
    </div>
  );
};

