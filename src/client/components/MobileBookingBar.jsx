import React from 'react';

const MobileBookingBar = ({
  visible,
  room,
  checkin,
  setCheckin,
  checkout,
  setCheckout,
  onSubmit,
  onClose,
}) => {
  if (!visible || !room) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white p-3 border-t-2 shadow-lg z-40">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg">Book Room {room.number}</h3>
        <button onClick={onClose} className="font-bold text-xl">&times;</button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium">Check-In</label>
          <input
            type="date"
            className="w-full border px-2 py-1 rounded"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">Check-Out</label>
          <input
            type="date"
            className="w-full border px-2 py-1 rounded"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
          />
        </div>
        <button
          onClick={onSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded mt-2 sm:mt-0 self-end"
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

export default MobileBookingBar;
