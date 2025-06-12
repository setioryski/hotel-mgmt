import React from 'react';

/**
 * Modal for creating or editing a booking, 
 * with inline guest search / add / edit.
 */
export default function BookingModal({
  visible,
  rooms,
  filteredGuests,
  guestInputRef,
  form,
  handlers,
  onAddGuest,
  onUpdateGuest,
  onSubmit,
  onCancel,
  onCancelBooking,
}) {
  if (!visible) return null;

  const {
    isEditing,
    selectedRoom,
    bookingStart,
    bookingEnd,
    bookingStatus,
    bookingFormError,
    guestSearch,
    showGuestSuggestions,
    newGuestMode,
    editingGuestMode,
    newGuest,
    editingGuest,
  } = form;

  const {
    setSelectedRoom,
    setBookingStart,
    setBookingEnd,
    setBookingStatus,
    setBookingFormError,
    setGuestSearch,
    setShowGuestSuggestions,
    setNewGuestMode,
    setEditingGuestMode,
    setNewGuest,
    setEditingGuest,
    setSelectedGuest,
  } = handlers;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-96 relative">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? 'Edit Booking' : 'New Booking'}
        </h2>
        {bookingFormError && (
          <div className="text-red-600 mb-2">{bookingFormError}</div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Room selector */}
          <div>
            <label className="block font-medium">Room:</label>
            <select
              className="w-full border px-2 py-1 rounded"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              <option value="">— Select Room —</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {`Room ${r.number}`}
                </option>
              ))}
            </select>
          </div>

          {/* Guest autocomplete / new */}
          <div ref={guestInputRef}>
            <label className="block font-medium mb-1">Guest:</label>
            <input
              type="text"
              className="w-full border px-2 py-1 rounded mb-1"
              placeholder="Search guest…"
              value={guestSearch}
              onChange={(e) => {
                setGuestSearch(e.target.value);
                setShowGuestSuggestions(true);
                setEditingGuestMode(false);
                setNewGuestMode(false);
              }}
              onFocus={() => setShowGuestSuggestions(true)}
            />
            {showGuestSuggestions && (
              <ul className="absolute z-20 bg-white border w-full max-h-40 overflow-y-auto rounded mt-1 shadow">
                <li
                  className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-blue-600"
                  onClick={() => {
                    setNewGuestMode(true);
                    setShowGuestSuggestions(false);
                  }}
                >
                  + Add new guest
                </li>
                {filteredGuests.map((g) => (
                  <li
                    key={g.id}
                    className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setSelectedGuest(g.id);
                      setGuestSearch(g.name);
                      setShowGuestSuggestions(false);
                    }}
                  >
                    {g.name} ({g.email || '—'})
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* New Guest Form */}
          {newGuestMode && (
            <div className="space-y-2">
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                placeholder="Name"
                value={newGuest.name}
                onChange={(e) =>
                  setNewGuest((p) => ({ ...p, name: e.target.value }))
                }
              />
              <input
                type="email"
                className="w-full border px-2 py-1 rounded"
                placeholder="Email"
                value={newGuest.email}
                onChange={(e) =>
                  setNewGuest((p) => ({ ...p, email: e.target.value }))
                }
              />
              <input
                type="tel"
                className="w-full border px-2 py-1 rounded"
                placeholder="Phone"
                value={newGuest.phone}
                onChange={(e) =>
                  setNewGuest((p) => ({ ...p, phone: e.target.value }))
                }
              />
              <button
                type="button"
                onClick={onAddGuest}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Save Guest
              </button>
              {newGuest.error && (
                <div className="text-red-600">{newGuest.error}</div>
              )}
            </div>
          )}

          {/* Edit Guest Form */}
          {editingGuestMode && (
            <div className="space-y-2">
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                value={editingGuest.name}
                onChange={(e) =>
                  setEditingGuest((p) => ({ ...p, name: e.target.value }))
                }
              />
              <input
                type="email"
                className="w-full border px-2 py-1 rounded"
                value={editingGuest.email}
                onChange={(e) =>
                  setEditingGuest((p) => ({ ...p, email: e.target.value }))
                }
              />
              <input
                type="tel"
                className="w-full border px-2 py-1 rounded"
                value={editingGuest.phone}
                onChange={(e) =>
                  setEditingGuest((p) => ({ ...p, phone: e.target.value }))
                }
              />
              <button
                type="button"
                onClick={onUpdateGuest}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Update Guest
              </button>
              {editingGuest.error && (
                <div className="text-red-600">{editingGuest.error}</div>
              )}
            </div>
          )}

          {/* Dates */}
          <div>
            <label className="block font-medium">Check-In</label>
            <input
              type="date"
              className="w-full border px-2 py-1 rounded"
              value={bookingStart}
              onChange={(e) => setBookingStart(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium">Check-Out</label>
            <input
              type="date"
              className="w-full border px-2 py-1 rounded"
              value={bookingEnd}
              onChange={(e) => setBookingEnd(e.target.value)}
            />
          </div>

          {/* Status (edit only) */}
          {isEditing && (
            <div>
              <label className="block font-medium">Status</label>
              <select
                className="w-full border px-2 py-1 rounded"
                value={bookingStatus}
                onChange={(e) => setBookingStatus(e.target.value)}
              >
                <option value="tentative">Tentative</option>
                <option value="booked">Booked</option>
                <option value="checkedin">Checked In</option>
                <option value="checkedout">Checked Out</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded border"
            >
              Cancel
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={onCancelBooking}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Cancel Booking
              </button>
            )}
            {!newGuestMode && !editingGuestMode && (
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                {isEditing ? 'Update' : 'Book'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
