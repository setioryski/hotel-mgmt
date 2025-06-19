import React from 'react';

const LegendItem = ({ color, label }) => (
  <div className="flex items-center space-x-1 mt-1 sm:mt-0">
    <span className={`w-4 h-4 bg-${color} inline-block rounded`} />
    <span>{label}</span>
  </div>
);

const SchedulerLegend = () => {
  return (
    <div className="mt-4 p-2 bg-white border rounded shadow text-sm">
      <strong>Legend:</strong>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:space-x-4 mt-1">
        <LegendItem color="yellow-500" label="Tentative" />
        <LegendItem color="blue-500" label="Booked" />
        <LegendItem color="green-500" label="Checked In" />
        <LegendItem color="red-500" label="Checked Out" />
        <LegendItem color="gray-600" label="Cancelled / Block" />
      </div>
    </div>
  );
};

export default SchedulerLegend;
