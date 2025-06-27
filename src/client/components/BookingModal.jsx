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
  filteredGuests,
  selectedGuest,
  setSelectedGuest,
  setEditingGuestMode,
  onStartEditGuest,
  setNewGuestMode,
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
  bookingStart,
  setBookingStart,
  bookingEnd,
  setBookingEnd,
  bookingPrice,
  setBookingPrice,
  bookingTotal,
  bookingNotes,
  setBookingNotes,
  bookingStatus,
  setBookingStatus,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div
        className="
          bg-white p-6 rounded-lg shadow-lg w-full max-w-md
          relative max-h-[85vh] overflow-y-auto
        "
      >
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
                  Room {r.number}
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
                className="w-full border px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* New Guest Form */}
          {newGuestMode && (
            <div className="space-y-2 bg-gray-50 p-3 rounded">
              {newGuestError && <div className="text-red-600">{newGuestError}</div>}
              <div>
                <label className="block font-medium">Name:</label>
                <input
                  type="text"
                  className="w-full border px-2 py-1 rounded"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Email (optional):</label>
                <input
                  type="email"
                  className="w-full border px-2 py-1 rounded"
                  value={newGuestEmail}
                  onChange={(e) => setNewGuestEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Phone (optional):</label>
                <input
                  type="tel"
                  className="w-full border px-2 py-1 rounded"
                  value={newGuestPhone}
                  onChange={(e) => setNewGuestPhone(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddNewGuest}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Add Guest
                </button>
              </div>
            </div>
          )}

          {/* Edit Guest Form */}
          {editingGuestMode && (
            <div className="space-y-2 bg-gray-50 p-3 rounded">
              {editingGuestError && <div className="text-red-600">{editingGuestError}</div>}
              <div>
                <label className="block font-medium">Name:</label>
                <input
                  type="text"
                  className="w-full border px-2 py-1 rounded"
                  value={editingGuestName}
                  onChange={(e) => setEditingGuestName(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Email:</label>
                <input
                  type="email"
                  className="w-full border px-2 py-1 rounded"
                  value={editingGuestEmail}
                  onChange={(e) => setEditingGuestEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Phone:</label>
                <input
                  type="tel"
                  className="w-full border px-2 py-1 rounded"
                  value={editingGuestPhone}
                  onChange={(e) => setEditingGuestPhone(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGuestUpdate}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Update Guest
                </button>
              </div>
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

          {/* Price */}
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
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder="e.g. Late check-in, special requests…"
            />
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
