import React from 'react';

/**
 * Color‐coded legend beneath the calendar.
 */
export default function Legend() {
  return (
    <div className="mt-4 p-2 bg-white border rounded shadow text-sm">
      <strong>Legend:</strong>
      <div className="flex space-x-4 mt-1">
        <div className="flex items-center space-x-1">
          <span className="w-4 h-4 bg-yellow-500 inline-block rounded" />
          Tentative
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-4 h-4 bg-blue-500 inline-block rounded" />
          Booked
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-4 h-4 bg-green-500 inline-block rounded" />
          Checked In
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-4 h-4 bg-red-500 inline-block rounded" />
          Checked Out
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-4 h-4 bg-gray-600 inline-block rounded" />
          Cancelled / Block
        </div>
      </div>
    </div>
  );
}
