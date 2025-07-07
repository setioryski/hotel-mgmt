// src/client/components/BookingModal.jsx
import React, { useState, useEffect } from 'react';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const BookingModal = ({
  visible,
  isEditing,
  formError,
  handleSubmit,         // single: event; group: array of entries
  closeModal,
  handleCancelBooking,   // only in single/edit mode
  selectedRoom,
  setSelectedRoom,
  resources,             // room list
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
  const [activeTab, setActiveTab] = useState('single');
  const [groupError, setGroupError] = useState('');

  // Reset tab & errors when modal opens
  useEffect(() => {
    if (visible) {
      setActiveTab('single');
      setGroupError('');
    }
  }, [visible]);

  // Template for a new group entry
  const blankEntry = {
    selectedRoom,
    selectedGuest,
    bookingStart,
    bookingEnd,
    bookingPrice,
    bookingNotes,
  };

  const [entries, setEntries] = useState([{ ...blankEntry }]);

  // Reset entries when switching to Group tab
  useEffect(() => {
    if (visible && activeTab === 'multiple') {
      setEntries([{ ...blankEntry }]);
      setGroupError('');
    }
  }, [
    visible,
    activeTab,
    selectedRoom,
    selectedGuest,
    bookingStart,
    bookingEnd,
    bookingPrice,
    bookingNotes,
  ]);

  // Helpers to manage entries
  const addEntry = () => {
    const roomIds = resources.map(r => r.id);
    const lastRoomId = entries[entries.length - 1]?.selectedRoom;
    let nextRoomId = roomIds[0] || '';
    if (lastRoomId) {
      const idx = roomIds.indexOf(lastRoomId);
      if (idx >= 0) nextRoomId = roomIds[(idx + 1) % roomIds.length];
    }
    setEntries([...entries, { ...blankEntry, selectedRoom: nextRoomId }]);
  };

  const removeEntry = idx =>
    setEntries(entries.filter((_, i) => i !== idx));

  const updateEntry = (idx, field, value) =>
    setEntries(entries.map((e, i) =>
      i === idx ? { ...e, [field]: value } : e
    ));

  // Calculate exact integer nights × price
  function calcTotal({ bookingStart, bookingEnd, bookingPrice }) {
    if (!bookingStart || !bookingEnd || !bookingPrice) return 0;
    const [y1, m1, d1] = bookingStart.split('-').map(Number);
    const [y2, m2, d2] = bookingEnd.split('-').map(Number);
    const s = new Date(y1, m1 - 1, d1);
    const e = new Date(y2, m2 - 1, d2);
    const nights = Math.round((e.getTime() - s.getTime()) / MS_PER_DAY);
    if (nights <= 0) return 0;
    return nights * parseFloat(bookingPrice);
  }

  // Sum of all entries
  const groupTotal = entries
    .reduce((sum, e) => sum + calcTotal(e), 0)
    .toFixed(2);

  // Handle group submit with validation
  const onMultiSubmit = e => {
    e.preventDefault();
    for (let i = 0; i < entries.length; i++) {
      const en = entries[i];
      if (!en.selectedRoom) {
        setGroupError(`Entry ${i + 1}: Room is required`);
        return;
      }
      if (!en.selectedGuest) {
        setGroupError(`Entry ${i + 1}: Guest is required`);
        return;
      }
      if (!en.bookingStart || !en.bookingEnd) {
        setGroupError(`Entry ${i + 1}: Check-in and check-out are required`);
        return;
      }
      if (new Date(en.bookingStart) >= new Date(en.bookingEnd)) {
        setGroupError(`Entry ${i + 1}: Check-out must be after check-in`);
        return;
      }
      const priceNum = parseFloat(en.bookingPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        setGroupError(`Entry ${i + 1}: Price per night must be > 0`);
        return;
      }
    }
    setGroupError('');
    handleSubmit(entries);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-center ${
              activeTab === 'single'
                ? 'border-b-2 border-blue-600 font-semibold'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('single')}
          >
            Single Booking
          </button>
          <button
            className={`flex-1 py-3 text-center ${
              activeTab === 'multiple'
                ? 'border-b-2 border-blue-600 font-semibold'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('multiple')}
          >
            Group Booking
          </button>
        </div>

        {/* Shared error */}
        {formError && (
          <div className="text-red-600 px-6 py-3">{formError}</div>
        )}

        {/* Single Booking */}
        {activeTab === 'single' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Room */}
            <div>
              <label className="block font-medium">Room:</label>
              <select
                className="w-full border px-2 py-1 rounded"
                value={selectedRoom}
                onChange={e => setSelectedRoom(e.target.value)}
              >
                <option value="">— Select Room —</option>
                {resources.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.number}
                  </option>
                ))}
              </select>
            </div>

            {/* Guest autocomplete */}
            <div ref={guestInputRef} className="relative">
              <label className="block font-medium mb-1">Guest:</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  className="w-full border px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search guest…"
                  value={guestSearch}
                  onChange={e => {
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
                  {filteredGuests.map(g => (
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
                    onChange={e => setNewGuestName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium">Email (optional):</label>
                  <input
                    type="email"
                    className="w-full border px-2 py-1 rounded"
                    value={newGuestEmail}
                    onChange={e => setNewGuestEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium">Phone (optional):</label>
                  <input
                    type="tel"
                    className="w-full border px-2 py-1 rounded"
                    value={newGuestPhone}
                    onChange={e => setNewGuestPhone(e.target.value)}
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
                    onChange={e => setEditingGuestName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium">Email:</label>
                  <input
                    type="email"
                    className="w-full border px-2 py-1 rounded"
                    value={editingGuestEmail}
                    onChange={e => setEditingGuestEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-medium">Phone:</label>
                  <input
                    type="tel"
                    className="w-full border px-2 py-1 rounded"
                    value={editingGuestPhone}
                    onChange={e => setEditingGuestPhone(e.target.value)}
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
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block font-medium">Check-In</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={bookingStart}
                  onChange={e => setBookingStart(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block font-medium">Check-Out</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={bookingEnd}
                  onChange={e => setBookingEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block font-medium">Price per Night</label>
              <input
                type="number"
                step="0.01"
                className="w-full border px-2 py-1 rounded"
                value={bookingPrice}
                onChange={e => setBookingPrice(e.target.value)}
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
                onChange={e => setBookingNotes(e.target.value)}
                placeholder="e.g. Late check-in, special requests…"
              />
            </div>

            {/* Status */}
            {isEditing && (
              <div>
                <label className="block font-medium">Status</label>
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={bookingStatus}
                  onChange={e => setBookingStatus(e.target.value)}
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
        )}

        {/* Group Booking */}
        {activeTab === 'multiple' && (
          <form onSubmit={onMultiSubmit} className="p-6 space-y-4">
            {groupError && (
              <div className="text-red-600 mb-2">{groupError}</div>
            )}

            {entries.map((entry, i) => (
              <div key={i} className="border p-4 rounded space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Entry {i + 1}</h3>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(i)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Room */}
                <div>
                  <label className="block font-medium mb-1">Room:</label>
                  <select
                    className="w-full border px-2 py-1 rounded"
                    value={entry.selectedRoom}
                    onChange={e => updateEntry(i, 'selectedRoom', e.target.value)}
                  >
                    <option value="">— Select Room —</option>
                    {resources.map(r => (
                      <option key={r.id} value={r.id}>
                        Room {r.number}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Guest */}
                <div>
                  <label className="block font-medium mb-1">Guest:</label>
                  <select
                    className="w-full border px-2 py-1 rounded"
                    value={entry.selectedGuest}
                    onChange={e => updateEntry(i, 'selectedGuest', e.target.value)}
                  >
                    <option value="">— Select Guest —</option>
                    {filteredGuests.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.email || '—'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block font-medium mb-1">Check-In:</label>
                    <input
                      type="date"
                      className="w-full border px-2 py-1 rounded"
                      value={entry.bookingStart}
                      onChange={e => updateEntry(i, 'bookingStart', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block font-medium mb-1">Check-Out:</label>
                    <input
                      type="date"
                      className="w-full border px-2 py-1 rounded"
                      value={entry.bookingEnd}
                      onChange={e => updateEntry(i, 'bookingEnd', e.target.value)}
                    />
                  </div>
                </div>

                {/* Price & Total */}
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block font-medium mb-1">Price (per night):</label>
                    <input
                      type="number"
                      className="w-full border px-2 py-1 rounded"
                      value={entry.bookingPrice}
                      onChange={e => updateEntry(i, 'bookingPrice', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block font-medium mb-1">Total:</label>
                    <input
                      type="text"
                      className="w-full border px-2 py-1 rounded bg-gray-100"
                      value={calcTotal(entry).toFixed(2)}
                      readOnly
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-medium mb-1">Notes:</label>
                  <textarea
                    className="w-full border px-2 py-1 rounded"
                    rows={2}
                    value={entry.bookingNotes}
                    onChange={e => updateEntry(i, 'bookingNotes', e.target.value)}
                  />
                </div>
              </div>
            ))}

            {/* Group total */}
            <div className="text-right font-semibold">
              Total Price (All Entries): {groupTotal}
            </div>

            <button
              type="button"
              onClick={addEntry}
              className="text-blue-600 hover:underline"
            >
              + Add another entry
            </button>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded bg-gray-300 text-gray-700 hover:bg-gray-400"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                {isEditing ? 'Update All' : 'Book All'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
