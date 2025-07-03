// src/client/components/GroupBookingModal.jsx
import React, { useState, useEffect } from 'react';

/**
 * Props:
 * - visible: boolean
 * - resources: Array of room objects { id, number, type, price }
 * - guestSearch: string
 * - setGuestSearch: (str) => void
 * - showGuestSuggestions: boolean
 * - setShowGuestSuggestions: (bool) => void
 * - filteredGuests: Array of guest objects { id, name }
 * - selectedGuest: string (guest ID)
 * - setSelectedGuest: (id) => void
 * - onCreateGuest: () => void
 * - formError: string
 * - handleSubmit: function(payloadArray)
 * - closeModal: () => void
 */
const GroupBookingModal = ({
  visible,
  resources,
  guestSearch,
  setGuestSearch,
  showGuestSuggestions,
  setShowGuestSuggestions,
  filteredGuests,
  selectedGuest,
  setSelectedGuest,
  onCreateGuest,
  formError,
  handleSubmit,
  closeModal,
}) => {
  // Default dates
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Selected rooms and per-room entries
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [entries, setEntries] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    const newEntries = selectedRoomIds.map(id => {
      const room = resources.find(r => r.id === id) || {};
      return {
        roomId: id,
        label: `Room ${room.number || id} (${room.type || '—'})`,
        startDate: todayStr,
        endDate: tomorrowStr,
        price: room.price != null ? room.price : 0,
        notes: '',
      };
    });
    setEntries(newEntries);
  }, [selectedRoomIds, resources, todayStr, tomorrowStr]);

  // Recalc total
  useEffect(() => {
    const sum = entries.reduce((acc, e) => acc + (parseFloat(e.price) || 0), 0);
    setTotalPrice(sum);
  }, [entries]);

  const toggleRoom = id => {
    setSelectedRoomIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleEntryChange = (index, field, value) => {
    setEntries(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleFormSubmit = e => {
    e.preventDefault();
    if (!selectedGuest) return alert('Please select or add a guest.');
    if (entries.length === 0) return alert('Please select at least one room.');

    for (const entry of entries) {
      if (!entry.startDate || !entry.endDate) {
        return alert(`Fill dates for ${entry.label}.`);
      }
      if (new Date(entry.startDate) >= new Date(entry.endDate)) {
        return alert(`Check-out after check-in for ${entry.label}.`);
      }
    }

    const payload = entries.map(e => ({
      room: e.roomId,
      guest: selectedGuest,
      startDate: `${e.startDate}T12:00:00`,
      endDate: `${e.endDate}T11:59:00`,
      price: parseFloat(e.price),
      notes: e.notes,
    }));

    handleSubmit(payload);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-4">Group Booking</h2>

        {formError && <p className="text-red-500 mb-4">{formError}</p>}

        <form onSubmit={handleFormSubmit}>
          {/* Guest */}
          <div className="mb-4 relative">
            <label className="block font-medium mb-1">Guest</label>
            <input
              type="text"
              value={guestSearch}
              onChange={e => {
                setGuestSearch(e.target.value);
                setShowGuestSuggestions(true);
                setSelectedGuest('');
              }}
              placeholder="Search or add guest"
              className="w-full border rounded p-2"
            />
            {showGuestSuggestions && (
              <ul className="absolute left-0 right-0 bg-white border rounded mt-1 max-h-40 overflow-auto z-10">
                {filteredGuests.map(g => (
                  <li
                    key={g.id}
                    onClick={() => {
                      setSelectedGuest(g.id);
                      setGuestSearch(g.name);
                      setShowGuestSuggestions(false);
                    }}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {g.name}
                  </li>
                ))}
                <li
                  onClick={() => {
                    onCreateGuest();
                    setShowGuestSuggestions(false);
                  }}
                  className="p-2 hover:bg-gray-100 cursor-pointer text-blue-600"
                >
                  + Add new guest
                </li>
              </ul>
            )}
          </div>

          {/* Select Rooms */}
          <div className="mb-4">
            <p className="font-medium mb-2">Select Rooms</p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto border rounded p-2">
              {resources.map(r => (
                <label key={r.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedRoomIds.includes(r.id)}
                    onChange={() => toggleRoom(r.id)}
                  />
                  <span>Room {r.number} ({r.type})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Per-room details */}
          {entries.map((e, i) => (
            <div key={e.roomId} className="mb-4 border-b pb-4">
              <h3 className="font-medium mb-2">{e.label}</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm mb-1">Check-in</label>
                  <input
                    type="date"
                    value={e.startDate}
                    onChange={ev => handleEntryChange(i, 'startDate', ev.target.value)}
                    className="w-full border rounded p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Check-out</label>
                  <input
                    type="date"
                    value={e.endDate}
                    onChange={ev => handleEntryChange(i, 'endDate', ev.target.value)}
                    className="w-full border rounded p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Price</label>
                  <input
                    type="number"
                    value={e.price}
                    step="0.01"
                    onChange={ev => handleEntryChange(i, 'price', ev.target.value)}
                    className="w-full border rounded p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Notes</label>
                  <input
                    type="text"
                    value={e.notes}
                    onChange={ev => handleEntryChange(i, 'notes', ev.target.value)}
                    className="w-full border rounded p-2"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Total Price */}
          <div className="mb-6 text-right">
            <span className="font-semibold text-lg">Total: Rp {totalPrice.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              Book Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupBookingModal;
