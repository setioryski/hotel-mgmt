// src/client/components/GroupBookingModal.jsx
import React, { useState, useEffect } from 'react';

/**
 * Props:
 * - visible: boolean
 * - resources: Array of room objects { id, number, type, price }
 * - guests:    Array of guest objects { id, name }
 * - formError: string (optional)
 * - onSubmit:  function(payload:Array) where each payload entry is
 *      { room: string, guest: string, startDate: string, endDate: string, price: number }
 * - onCancel:  function()
 */
const GroupBookingModal = ({
  visible,
  resources,
  guests,
  formError,
  onSubmit,
  onCancel,
}) => {
  // compute today & tomorrow in YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // state for each room’s entry
  const [entries, setEntries] = useState([]);

  // initialize entries when modal opens
  useEffect(() => {
    if (!visible) return;
    const initial = resources.map((r) => ({
      roomId:    r.id,
      label:     `Room ${r.number} (${r.type})`,
      startDate: today,
      endDate:   tomorrow,
      price:     r.price,
      guestId:   '',
    }));
    setEntries(initial);
  }, [visible, resources, today, tomorrow]);

  // calculate total price
  const totalPrice = entries.reduce(
    (sum, e) => sum + (parseFloat(e.price) || 0),
    0
  );

  // update one field of an entry
  const handleEntryChange = (idx, field, value) => {
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // validation
    for (const e of entries) {
      if (!e.guestId) {
        return alert(`Please select a guest for ${e.label}.`);
      }
      if (!e.startDate || !e.endDate) {
        return alert(`Dates missing for ${e.label}.`);
      }
      if (new Date(e.startDate) >= new Date(e.endDate)) {
        return alert(`Check-out must be after check-in for ${e.label}.`);
      }
    }

    // build payload
    const payload = entries.map((e) => ({
      room:      e.roomId,
      guest:     e.guestId,
      startDate: `${e.startDate}T12:00:00`,
      endDate:   `${e.endDate}T11:59:00`,
      price:     parseFloat(e.price),
    }));

    onSubmit(payload);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
        <h2 className="text-2xl font-semibold mb-4">Group Booking</h2>
        {formError && <p className="text-red-500 mb-4">{formError}</p>}

        <form onSubmit={handleSubmit}>
          {entries.map((e, i) => (
            <div key={e.roomId} className="mb-6 border-b pb-4">
              <h3 className="font-medium mb-2">{e.label}</h3>
              <div className="grid grid-cols-4 gap-4">
                {/* Guest */}
                <div>
                  <label className="block text-sm mb-1">Guest</label>
                  <select
                    value={e.guestId}
                    onChange={(ev) =>
                      handleEntryChange(i, 'guestId', ev.target.value)
                    }
                    className="w-full border rounded p-2"
                  >
                    <option value="">Select guest…</option>
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Check-in */}
                <div>
                  <label className="block text-sm mb-1">Check-in</label>
                  <input
                    type="date"
                    value={e.startDate}
                    onChange={(ev) =>
                      handleEntryChange(i, 'startDate', ev.target.value)
                    }
                    className="w-full border rounded p-2"
                  />
                </div>

                {/* Check-out */}
                <div>
                  <label className="block text-sm mb-1">Check-out</label>
                  <input
                    type="date"
                    value={e.endDate}
                    onChange={(ev) =>
                      handleEntryChange(i, 'endDate', ev.target.value)
                    }
                    className="w-full border rounded p-2"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={e.price}
                    onChange={(ev) =>
                      handleEntryChange(i, 'price', ev.target.value)
                    }
                    className="w-full border rounded p-2"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="mb-6 text-right">
            <span className="font-semibold text-lg">
              Total: Rp {totalPrice.toLocaleString('id-ID', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Book Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupBookingModal;
