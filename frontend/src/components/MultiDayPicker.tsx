import React, { useState, useEffect } from 'react';
import { Calendar, Plus, X, Check, Clock, CalendarDays } from 'lucide-react';

export interface MultiDaySelection {
  dates: string[];
  startDate: string;
  endDate: string;
  daysCount: number;
  mode: 'RANGE' | 'SPECIFIC';
}

interface MultiDayPickerProps {
  initialStartDate?: string;
  initialEndDate?: string;
  initialDates?: string[];
  onChange: (selection: MultiDaySelection) => void;
  accentColor?: 'blue' | 'rose';
}

export const MultiDayPicker: React.FC<MultiDayPickerProps> = ({
  initialStartDate,
  initialEndDate,
  initialDates,
  onChange,
  accentColor = 'rose'
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [mode, setMode] = useState<'RANGE' | 'SPECIFIC'>('RANGE');
  const [startDate, setStartDate] = useState(initialStartDate || today);
  const [endDate, setEndDate] = useState(initialEndDate || today);
  const [customDates, setCustomDates] = useState<string[]>(
    initialDates && initialDates.length > 0 ? initialDates : [initialStartDate || today]
  );
  const [pickerDate, setPickerDate] = useState(today);

  // Helper: compute dates in continuous range
  const getDatesInRange = (s: string, e: string): string[] => {
    const dates: string[] = [];
    const start = new Date(s);
    const end = new Date(e);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [s || today];

    const cur = new Date(start);
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  // Helper: Format friendly date
  const formatFriendlyDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr;
      const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
      const month = d.toLocaleDateString(undefined, { month: 'short' });
      const day = d.getDate();
      const isToday = dateStr === today;
      return `${weekday}, ${month} ${day}${isToday ? ' (Today)' : ''}`;
    } catch {
      return dateStr;
    }
  };

  // Notify parent on change
  useEffect(() => {
    if (mode === 'RANGE') {
      const dates = getDatesInRange(startDate, endDate);
      onChange({
        dates,
        startDate,
        endDate,
        daysCount: dates.length,
        mode: 'RANGE'
      });
    } else {
      const sorted = [...customDates].sort();
      const s = sorted[0] || today;
      const e = sorted[sorted.length - 1] || today;
      onChange({
        dates: sorted,
        startDate: s,
        endDate: e,
        daysCount: sorted.length,
        mode: 'SPECIFIC'
      });
    }
  }, [mode, startDate, endDate, customDates]);

  // Presets for Range Mode
  const applyPreset = (days: number, offsetDays = 0) => {
    const s = new Date();
    s.setDate(s.getDate() + offsetDays);
    const e = new Date(s);
    e.setDate(e.getDate() + (days - 1));

    const sStr = s.toISOString().split('T')[0];
    const eStr = e.toISOString().split('T')[0];
    setStartDate(sStr);
    setEndDate(eStr);
  };

  // Toggle specific date
  const toggleCustomDate = (dateStr: string) => {
    if (customDates.includes(dateStr)) {
      if (customDates.length > 1) {
        setCustomDates(customDates.filter(d => d !== dateStr));
      }
    } else {
      setCustomDates([...customDates, dateStr].sort());
    }
  };

  // Add date from input
  const handleAddPickerDate = () => {
    if (pickerDate && !customDates.includes(pickerDate)) {
      setCustomDates([...customDates, pickerDate].sort());
    }
  };

  // Quick 10 days array for instant clicking
  const quickDays = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const rangeDates = getDatesInRange(startDate, endDate);
  const totalDays = mode === 'RANGE' ? rangeDates.length : customDates.length;

  return (
    <div className="space-y-3">
      {/* Mode Selection Tabs */}
      <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode('RANGE')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-md transition cursor-pointer ${
            mode === 'RANGE'
              ? 'bg-white text-slate-800 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
          <span>Continuous Date Range</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('SPECIFIC')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-md transition cursor-pointer ${
            mode === 'SPECIFIC'
              ? 'bg-white text-slate-800 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Check className="w-3.5 h-3.5 text-rose-600" />
          <span>Pick Multiple Custom Days</span>
        </button>
      </div>

      {mode === 'RANGE' ? (
        <div className="space-y-3">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 font-medium">Quick Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset(1, 0)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
            >
              Today (1d)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(1, 1)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
            >
              Tomorrow (1d)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(2, 0)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
            >
              2 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset(3, 0)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
            >
              3 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset(5, 0)}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
            >
              5 Days
            </button>
          </div>

          {/* Start and End Date Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 font-mono transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 font-mono transition"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Quick Click Chips for next 10 days */}
          <div>
            <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
              <span>Click to select / unselect specific days:</span>
              <span className="text-[10px] text-slate-400">Upcoming 10 Days</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {quickDays.map((dStr) => {
                const isSelected = customDates.includes(dStr);
                const d = new Date(dStr + 'T00:00:00');
                const dayName = d.toLocaleDateString(undefined, { weekday: 'narrow' });
                const dayNum = d.getDate();
                const isToday = dStr === today;

                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => toggleCustomDate(dStr)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 border-rose-600 text-white font-bold shadow-sm'
                        : 'bg-white border-slate-200 hover:border-rose-300 text-slate-700'
                    }`}
                    title={formatFriendlyDate(dStr)}
                  >
                    <span className="text-[10px] opacity-80">{dayName}</span>
                    <span className="text-xs font-bold">{dayNum}</span>
                    {isToday && <span className="text-[9px] scale-90 font-medium">Today</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Any Custom Date Input */}
          <div className="flex items-center space-x-2 pt-1">
            <div className="flex-1">
              <input
                type="date"
                value={pickerDate}
                onChange={(e) => setPickerDate(e.target.value)}
                className="w-full bg-slate-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 font-mono transition"
              />
            </div>
            <button
              type="button"
              onClick={handleAddPickerDate}
              disabled={customDates.includes(pickerDate)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Date</span>
            </button>
          </div>

          {/* Selected Date Badges / Pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Selected Days ({customDates.length}):</span>
              {customDates.length > 1 && (
                <button
                  type="button"
                  onClick={() => setCustomDates([today])}
                  className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                >
                  Reset to Today
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              {customDates.map((dStr) => (
                <span
                  key={dStr}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium"
                >
                  <span>{formatFriendlyDate(dStr)}</span>
                  {customDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => toggleCustomDate(dStr)}
                      className="text-rose-400 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                      title="Remove date"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Duration Banner */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-50/80 border border-rose-200 text-xs">
        <div className="flex items-center space-x-1.5 text-rose-900 font-semibold">
          <Clock className="w-3.5 h-3.5 text-rose-600" />
          <span>Total Absence Duration:</span>
        </div>
        <span className="font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
          {totalDays} {totalDays > 1 ? 'Days Selected' : 'Day Selected'}
        </span>
      </div>
    </div>
  );
};

