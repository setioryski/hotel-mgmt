// src/client/components/BookingModal.jsx
import React from 'react';

const BookingModal = ({
  visible,
  isEditingBooking,
  bookingFormError,
  resources,
  guestInputRef,
  guestSearch,
  showGuestSuggestions,
  filteredGuests,
  newGuestMode,
  editingGuestMode,
  newGuestName,
  newGuestEmail,
  newGuestPhone,
  editingGuestName,
  editingGuestEmail,
  editingGuestPhone,
  selectedRoom,
  bookingStart,
  bookingEnd,
  bookingStatus,
  onGuestSearchChange,
  onToggleGuestSuggestions,
  onGuestSelect,
  onNewGuestNameChange,
  onNewGuestEmailChange,
  onNewGuestPhoneChange,
  onAddNewGuest,
  onEditingGuestNameChange,
  onEditingGuestEmailChange,
  onEditingGuestPhoneChange,
  onGuestUpdate,
  onRoomChange,
  onBookingStartChange,
  onBookingEndChange,
  onStatusChange,
  onBookingSubmit,
  onCancelBooking,
  closeBookingModal,
}) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-96 relative">
        <h2 className="text-xl font-semibold mb-4">
          {isEditingBooking ? 'Edit Booking' : 'New Booking'}
        </h2>
        {bookingFormError && (
          <div className="text-red-600 mb-2">{bookingFormError}</div>
        )}
        <form onSubmit={onBookingSubmit} className="space-y-4">
          {/* Room */}
          <div>
            <label className="block font-medium">Room:</label>
            <select
              className="w-full border px-2 py-1 rounded"
              value={selectedRoom}
              onChange={(e) => onRoomChange(e.target.value)}
            >
              <option value="">— Select Room —</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {`Room ${r.number}`}
                </option>
              ))}
            </select>
          </div>

          {/* Guest */}
          <div ref={guestInputRef}>
            <label className="block font-medium mb-1">Guest:</label>
            <input
              type="text"
              className="w-full border px-2 py-1 rounded mb-1"
              placeholder="Search guest."
              value={guestSearch}
              onChange={(e) => {
                onGuestSearchChange(e.target.value);
                onToggleGuestSuggestions(true);
              }}
              onFocus={() => onToggleGuestSuggestions(true)}
            />
            {showGuestSuggestions && (
              <ul className="absolute z-20 bg-white border w-full max-h-40 overflow-y-auto rounded mt-1 shadow">
                <li
                  className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-blue-600"
                  onClick={onAddNewGuest}
                >
                  + Add new guest
                </li>
                {filteredGuests.map((g) => (
                  <li
                    key={g.id}
                    className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                    onClick={() => onGuestSelect(g.id, g.name)}
                  >
                    {g.name} ({g.email || '—'})
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* New Guest */}
          {newGuestMode && (
            <div className="space-y-2">
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                placeholder="Name"
                value={newGuestName}
                onChange={(e) => onNewGuestNameChange(e.target.value)}
              />
              <input
                type="email"
                className="w-full border px-2 py-1 rounded"
                placeholder="Email"
                value={newGuestEmail}
                onChange={(e) => onNewGuestEmailChange(e.target.value)}
              />
              <input
                type="tel"
                className="w-full border px-2 py-1 rounded"
                placeholder="Phone"
                value={newGuestPhone}
                onChange={(e) => onNewGuestPhoneChange(e.target.value)}
              />
              <button
                type="button"
                onClick={onAddNewGuest}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Save Guest
              </button>
            </div>
          )}

          {/* Edit Guest */}
          {editingGuestMode && (
            <div className="space-y-2">
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                value={editingGuestName}
                onChange={(e) => onEditingGuestNameChange(e.target.value)}
              />
              <input
                type="email"
                className="w-full border px-2 py-1 rounded"
                value={editingGuestEmail}
                onChange={(e) => onEditingGuestEmailChange(e.target.value)}
              />
              <input
                type="tel"
                className="w-full border px-2 py-1 rounded"
                value={editingGuestPhone}
                onChange={(e) => onEditingGuestPhoneChange(e.target.value)}
              />
              <button
                type="button"
                onClick={onGuestUpdate}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Update Guest
              </button>
            </div>
          )}

          {/* Dates */}
          <div>
            <label className="block font-medium">Check-In</label>
            <input
              type="date"
              className="w-full border px-2 py-1 rounded"
              value={bookingStart}
              onChange={(e) => onBookingStartChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium">Check-Out</label>
            <input
              type="date"
              className="w-full border px-2 py-1 rounded"
              value={bookingEnd}
              onChange={(e) => onBookingEndChange(e.target.value)}
            />
          </div>

          {/* Status */}
          {isEditingBooking && (
            <div>
              <label className="block font-medium">Status</label>
              <select
                className="w-full border px-2 py-1 rounded"
                value={bookingStatus}
                onChange={(e) => onStatusChange(e.target.value)}
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
              onClick={closeBookingModal}
              className="px-4 py-2 rounded border"
            >
              Cancel
            </button>
            {isEditingBooking && (
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
                {isEditingBooking ? 'Update' : 'Book'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
