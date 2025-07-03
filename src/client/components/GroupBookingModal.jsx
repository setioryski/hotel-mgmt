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

  // State for selected rooms and entries
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [entries, setEntries] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [newGuestMode, setNewGuestMode] = useState(false);
const [newGuestName, setNewGuestName] = useState('');
const [newGuestEmail, setNewGuestEmail] = useState('');
const [newGuestPhone, setNewGuestPhone] = useState('');
const [newGuestError, setNewGuestError] = useState('');


  // Build entries whenever selectedRoomIds changes
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

  // Recalculate total price whenever entries change
useEffect(() => {
  const sum = entries.reduce((acc, e) => {
    const start = new Date(e.startDate);
    const end = new Date(e.endDate);
    const nights = Math.max((end - start) / (1000 * 60 * 60 * 24), 0);
    const pricePerNight = parseFloat(e.price) || 0;
    return acc + pricePerNight * nights;
  }, 0);
  setTotalPrice(sum);
}, [entries]);


  // Group rooms by type
  const groupedResources = resources.reduce((acc, room) => {
    const { type } = room;
    if (!acc[type]) acc[type] = [];
    acc[type].push(room);
    return acc;
  }, {});

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
        return alert(`Check-out must be after check-in for ${entry.label}.`);
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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4 sm:p-0">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-h-full sm:max-h-[80vh] sm:max-w-3xl overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">Group Booking</h2>

        {formError && <p className="text-red-500 mb-4">{formError}</p>}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Guest */}
          <div className="relative">
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
    setNewGuestMode(true);
    setShowGuestSuggestions(false);
  }}
  className="p-2 hover:bg-gray-100 cursor-pointer text-blue-600"
>
  + Add new guest
</li>

              </ul>
            )}
          </div>

          {newGuestMode && (
  <div className="bg-gray-50 border rounded p-3 space-y-2 mt-2">
    <div>
      <label className="block text-sm font-medium">Name</label>
      <input
        type="text"
        value={newGuestName}
        onChange={(e) => setNewGuestName(e.target.value)}
        className="w-full border rounded p-2"
        placeholder="Full name"
      />
    </div>
    <div>
      <label className="block text-sm font-medium">Email</label>
      <input
        type="email"
        value={newGuestEmail}
        onChange={(e) => setNewGuestEmail(e.target.value)}
        className="w-full border rounded p-2"
        placeholder="Email (optional)"
      />
    </div>
    <div>
      <label className="block text-sm font-medium">Phone</label>
      <input
        type="tel"
        value={newGuestPhone}
        onChange={(e) => setNewGuestPhone(e.target.value)}
        className="w-full border rounded p-2"
        placeholder="Phone (optional)"
      />
    </div>
    {newGuestError && <p className="text-red-500 text-sm">{newGuestError}</p>}
    <div className="flex justify-between mt-2">
      <button
        type="button"
        onClick={() => setNewGuestMode(false)}
        className="text-gray-600"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={async () => {
          if (!newGuestName.trim()) {
            setNewGuestError('Name is required');
            return;
          }
          setNewGuestError('');
          try {
            const res = await fetch('/api/guests', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: newGuestName,
                email: newGuestEmail,
                phone: newGuestPhone,
              }),
            });
            const guest = await res.json();
            if (!guest.id) throw new Error('Failed to create guest');
            setSelectedGuest(guest.id);
            setGuestSearch(guest.name);
            setNewGuestMode(false);
            toast.success('Guest created');
          } catch (err) {
            console.error(err);
            setNewGuestError(err.message || 'Failed to create guest');
          }
        }}
        className="bg-blue-600 text-white px-4 py-1 rounded"
      >
        Save Guest
      </button>
    </div>
  </div>
)}


          {/* Select Rooms - grouped by type */}
          <div>
            <p className="font-medium mb-2">Select Rooms</p>
            <div className="max-h-40 overflow-auto border rounded p-2">
              {Object.entries(groupedResources).map(([type, rooms]) => (
                <div key={type} className="mb-3">
                  <h4 className="font-medium mb-1">{type}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rooms.map(r => (
                      <label key={r.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedRoomIds.includes(r.id)}
                          onChange={() => toggleRoom(r.id)}
                          className="h-5 w-5"
                        />
                        <span className="text-sm">Room {r.number}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-room details */}
          {entries.map((e, i) => (
            <div key={e.roomId} className="border-b pb-4">
              <h3 className="font-medium mb-2">{e.label}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="text-right">
            <span className="font-semibold text-lg">
              Total: Rp {totalPrice.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              type="button"
              onClick={closeModal}
              className="w-full sm:w-auto px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded"
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
