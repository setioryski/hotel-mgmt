import React from 'react';
import { ViewTypes } from 'react-big-scheduler';

const SchedulerToolbar = ({
  selectedRoomType,
  setSelectedRoomType,
  roomTypes,
  onPrev,
  onToday,
  onNext,
  currentView,
  onViewChange,
  isBlockMode,
  setIsBlockMode,
}) => {
  return (
    <div className="flex flex-wrap items-center mb-4 gap-4">
      {/* Room Type Filter */}
      <div>
        <label className="mr-2 font-semibold">Room Type:</label>
        <select
          className="border px-2 py-1 rounded"
          value={selectedRoomType}
          onChange={(e) => setSelectedRoomType(e.target.value)}
        >
          <option value="all">All</option>
          {roomTypes.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={onPrev}
          className="bg-gray-200 hover:bg-gray-300 rounded w-10 h-8 flex items-center justify-center"
        >
          ←
        </button>
        <button
          onClick={onToday}
          className="bg-gray-200 hover:bg-gray-300 rounded px-3 h-8 flex items-center justify-center"
        >
          Today
        </button>
        <button
          onClick={onNext}
          className="bg-gray-200 hover:bg-gray-300 rounded w-10 h-8 flex items-center justify-center"
        >
          →
        </button>
      </div>

      {/* View Selector */}
      <div>
        <select
          className="border px-2 py-1 rounded"
          value={currentView}
          onChange={(e) =>
            onViewChange({
              viewType: e.target.value,
              showAgenda: false,
              isEventPerspective: false,
            })
          }
        >
          <option value={ViewTypes.Month}>Month</option>
          <option value={ViewTypes.Week}>Week</option>
          <option value={ViewTypes.Day}>Day</option>
        </select>
      </div>

      {/* Block Mode Toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="modeToggle"
          checked={isBlockMode}
          onChange={(e) => setIsBlockMode(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="modeToggle" className="ml-2 font-semibold">
          Block Mode
        </label>
      </div>
    </div>
  );
};

export default SchedulerToolbar;
