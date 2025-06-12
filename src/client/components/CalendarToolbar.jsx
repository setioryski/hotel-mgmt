// src/client/components/CalendarToolbar.jsx
import React from 'react';
import { ViewTypes } from 'react-big-scheduler';

const CalendarToolbar = ({
  hotels,
  selectedHotel,
  onHotelChange,
  roomTypes,
  selectedRoomType,
  onRoomTypeChange,
  onPrev,
  onNext,
  currentView,
  onViewChange,
  isBlockMode,
  onToggleBlockMode,
}) => (
  <div className="flex flex-wrap items-center mb-4 space-x-4">
    <div>
      <label className="mr-2 font-semibold">Hotel:</label>
      <select
        className="border px-2 py-1 rounded"
        value={selectedHotel || ''}
        onChange={(e) => onHotelChange(e.target.value)}
      >
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label className="mr-2 font-semibold">Room Type:</label>
      <select
        className="border px-2 py-1 rounded"
        value={selectedRoomType}
        onChange={(e) => onRoomTypeChange(e.target.value)}
      >
        <option value="all">All</option>
        {roomTypes.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
    </div>
    <div className="flex space-x-2">
      <button
        onClick={onPrev}
        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
      >
        ←
      </button>
      <button
        onClick={onNext}
        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
      >
        →
      </button>
    </div>
    <div>
      <select
        className="border px-2 py-1 rounded"
        value={currentView}
        onChange={(e) =>
          onViewChange({
            viewType: parseInt(e.target.value, 10),
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
    <div className="flex items-center ml-4">
      <input
        type="checkbox"
        id="modeToggle"
        checked={isBlockMode}
        onChange={(e) => onToggleBlockMode(e.target.checked)}
      />
      <label htmlFor="modeToggle" className="ml-1 font-semibold">
        Block Mode
      </label>
    </div>
  </div>
);

export default CalendarToolbar;
