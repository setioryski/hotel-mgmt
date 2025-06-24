// src/client/components/BookingModal.jsx
import React from 'react';

const BookingModal = ({
  visible,
  isEditing,
  formError,
  handleSubmit,
  closeModal,
  handleCancelBooking,
  selectedRoom,
  setSelectedRoom,
  resources,
  guestInputRef,
  guestSearch,
  setGuestSearch,
  showGuestSuggestions,
  setShowGuestSuggestions,
  selectedGuest,
  setSelectedGuest,
  setEditingGuestMode,
  onStartEditGuest,
  setNewGuestMode,
  filteredGuests,
  newGuestMode,
  newGuestName,
  setNewGuestName,
  newGuestEmail,
  setNewGuestEmail,
  newGuestPhone,
  setNewGuestPhone,
  handleAddNewGuest,
  newGuestError,
  editingGuestMode,
  editingGuestName,
  setEditingGuestName,
  editingGuestEmail,
  setEditingGuestEmail,
  editingGuestPhone,
  setEditingGuestPhone,
  handleGuestUpdate,
  editingGuestError,
  bookingPrice,
  setBookingPrice,
  bookingTotal,
  bookingStart,
  setBookingStart,
  bookingEnd,
  setBookingEnd,
  bookingStatus,
  setBookingStatus,
  bookingNotes,
  setBookingNotes,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 md:w-96 relative">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? 'Edit Booking' : 'New Booking'}
        </h2>
        {formError && <div className="text-red-600 mb-2">{formError}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room select */}
          <div>
            <label className="block font-medium">Room:</label>
            <select
              className="w-full border px-2 py-1 rounded"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              <option value="">— Select Room —</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {`Room ${r.number}`}
                </option>
              ))}
            </select>
          </div>

          {/* Guest autocomplete / add / edit */}
          <div ref={guestInputRef} className="relative">
            <label className="block font-medium mb-1">Guest:</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                className="w-full border px-2 py-1 rounded mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search guest…"
                value={guestSearch}
                onChange={(e) => {
                  setGuestSearch(e.target.value);
                  setShowGuestSuggestions(true);
                  setSelectedGuest('');
                  setEditingGuestMode(false);
                  setNewGuestMode(false);
                }}
                onFocus={() => setShowGuestSuggestions(true)}
              />
              {selectedGuest && !newGuestMode && !editingGuestMode && (
                <button
                  type="button"
                  onClick={onStartEditGuest}
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 whitespace-nowrap"
                >
                  Edit
                </button>
              )}
            </div>
            {showGuestSuggestions && (
              <ul className="absolute left-0 z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto divide-y divide-gray-200">
                <li
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer font-semibold text-blue-600"
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
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
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

          {/* Restored Price fields */}
          <div>
            <label className="block font-medium">Price per Night</label>
            <input
              type="number"
              step="0.01"
              className="w-full border px-2 py-1 rounded"
              value={bookingPrice}
              onChange={(e) => setBookingPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium">Total Price</label>
            <input
              type="text"
              readOnly
              className="w-full border px-2 py-1 rounded bg-gray-100"
              value={bookingTotal}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium">Notes (optional):</label>
            <textarea
              className="w-full border px-2 py-1 rounded"
              rows="3"
              placeholder="e.g. Special requests, late check-in..."
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
            ></textarea>
          </div>

          {/* Status (editing only) */}
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
          <div className="flex justify-between items-center flex-wrap gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded border"
            >
              Cancel
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelBooking}
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
};

export default BookingModal;
