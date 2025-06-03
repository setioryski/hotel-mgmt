// src/client/CalendarScheduler.jsx

import React, { useEffect, useState, useRef } from 'react';
import Scheduler, {
  SchedulerData,
  ViewTypes,
  DATE_FORMAT,
} from 'react-big-scheduler';
import moment from 'moment';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import 'react-big-scheduler/lib/css/style.css';

export default DragDropContext(HTML5Backend)(function CalendarScheduler() {
  // Scheduler state with 30-minute granularity
  const [schedulerData, setSchedulerData] = useState(
    new SchedulerData(
      moment().format(DATE_FORMAT),
      ViewTypes.Month,
      false,
      false,
      { minuteStep: 30 }
    )
  );
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);

  // Hotel selector
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);

  // Guests for dropdown/search
  const [guests, setGuests] = useState([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState('');

  // New guest form state
  const [newGuestMode, setNewGuestMode] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [newGuestError, setNewGuestError] = useState('');

  // Booking modal state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  // Form fields
  const [selectedRoom, setSelectedRoom] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [formError, setFormError] = useState('');

  const guestInputRef = useRef();

  // Generic JSON fetch helper
  const fetchJSON = async (url, opts = {}) => {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const data = await res.json();
    if (!res.ok) {
      const msg =
        data.msg ||
        (data.errors && data.errors.map((e) => e.msg).join(', ')) ||
        `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return data;
  };

  // Load hotels on mount
  useEffect(() => {
    fetchJSON('/api/hotels')
      .then((data) => {
        setHotels(data);
        if (data.length) setSelectedHotel(data[0].id);
      })
      .catch((err) => console.error('Failed to load hotels:', err));
  }, []);

  // Load guests on mount
  useEffect(() => {
    fetchJSON('/api/guests')
      .then((data) => setGuests(data))
      .catch((err) => console.error('Failed to load guests:', err));
  }, []);

  // Fetch rooms & bookings when hotel changes
  const loadData = () => {
    if (!selectedHotel) return;

    Promise.all([
      fetchJSON(`/api/rooms?hotel=${selectedHotel}`),
      fetchJSON(`/api/bookings?hotel=${selectedHotel}`),
    ])
      .then(([roomsResponse, bookingsResponse]) => {
        // Normalize rooms array
        const rooms = Array.isArray(roomsResponse)
          ? roomsResponse
          : roomsResponse.data || [];

        // Normalize bookings array
        const bookings = Array.isArray(bookingsResponse)
          ? bookingsResponse
          : Array.isArray(bookingsResponse.data)
          ? bookingsResponse.data
          : [];

        // Map rooms to scheduler resources
        const resourceList = rooms.map((r) => ({
          id: r.id,
          name: `Room ${r.number} (${r.type})`,
        }));

        // Map bookings to scheduler events
        const eventList = bookings
          .map((b) => {
            const id = b.id;
            const roomId = b.resourceId;
            const startDateStr = b.start || b.startDate;
            const endDateStr = b.end || b.endDate;
            const guestObj = b.guest || {};
            const title = guestObj.name || b.title || 'Unknown Guest';

            if (
              id === undefined ||
              roomId === undefined ||
              !startDateStr ||
              !endDateStr ||
              !title
            ) {
              return null;
            }

            const startMoment = moment(startDateStr);
            const endMoment = moment(endDateStr);
            const nights = endMoment.diff(startMoment, 'days');

            return {
              // REQUIRED fields
              id: id,
              resourceId: roomId,
              title: title,
              start: startMoment.format(DATE_FORMAT),
              end: endMoment.format(DATE_FORMAT),

              // OPTIONAL fields
              bgColor: b.bgColor || '#D9D9D9',
              guestEmail: guestObj.email || '',
              guestPhone: guestObj.phone || '',
              notes: b.notes || '',
              nights: nights,
              guestId: guestObj.id || null,
            };
          })
          .filter(Boolean);

        const sd = schedulerData;
        sd.setResources(resourceList);
        sd.setEvents(eventList);
        setResources(resourceList);
        setEvents(eventList);
        setSchedulerData(sd);
      })
      .catch((err) => console.error('Failed to load data:', err));
  };

  useEffect(loadData, [selectedHotel]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        guestInputRef.current &&
        !guestInputRef.current.contains(e.target)
      ) {
        setShowGuestSuggestions(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Open booking modal on empty slot click
  const onSelectSlot = (schedulerData, slotId, slotName, start, end) => {
    const startDate = moment(start).format('YYYY-MM-DD');
    const endDate = moment(end).format('YYYY-MM-DD');
    setSelectedRoom(slotId);
    setBookingStart(startDate);
    setBookingEnd(endDate);
    setSelectedGuest('');
    setGuestSearch('');
    setNewGuestMode(false);
    setFormError('');
    setIsEditing(false);
    setEditingEventId(null);
    setBookingModalVisible(true);
  };

  // Submit new booking or update existing booking
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!selectedRoom) return setFormError('Please select a room.');
    if (!selectedGuest) return setFormError('Please select a guest.');

    const startDateTime = `${bookingStart}T12:00:00`;
    const endDateTime = `${bookingEnd}T12:00:00`;
    if (new Date(startDateTime) >= new Date(endDateTime)) {
      return setFormError('Check-out must be after check-in.');
    }

    try {
      if (isEditing && editingEventId) {
        // Update booking
        await fetchJSON(`/api/bookings/${editingEventId}`, {
          method: 'PUT',
          body: JSON.stringify({
            room: selectedRoom,
            guest: selectedGuest,
            startDate: startDateTime,
            endDate: endDateTime,
          }),
        });
      } else {
        // Create new booking
        await fetchJSON('/api/bookings', {
          method: 'POST',
          body: JSON.stringify({
            room: selectedRoom,
            guest: selectedGuest,
            startDate: startDateTime,
            endDate: endDateTime,
          }),
        });
      }
      setBookingModalVisible(false);
      setIsEditing(false);
      setEditingEventId(null);
      setNewGuestMode(false);
      loadData();
    } catch (err) {
      console.error('Booking operation failed:', err);
      setFormError(err.message);
    }
  };

  // Cancel booking from modal
  const handleCancelBooking = async () => {
    if (!editingEventId) return;
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await fetchJSON(`/api/bookings/${editingEventId}`, { method: 'DELETE' });
      setBookingModalVisible(false);
      setIsEditing(false);
      setEditingEventId(null);
      setNewGuestMode(false);
      loadData();
    } catch (err) {
      console.error('Cancel booking failed:', err);
    }
  };

  const closeModal = () => {
    setBookingModalVisible(false);
    setIsEditing(false);
    setEditingEventId(null);
    setNewGuestMode(false);
    setNewGuestName('');
    setNewGuestEmail('');
    setNewGuestPhone('');
    setNewGuestError('');
  };

  // Update booking helper (for moves/resizes)
  const updateBooking = (id, body) =>
    fetchJSON(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
      .then(loadData)
      .catch((err) => console.error('Booking update failed:', err));

  const onEventMove = (ev, slotId, start, end) => {
    const startISO = moment(start).format();
    const endISO = moment(end).format();
    updateBooking(ev.id, {
      room: slotId,
      startDate: startISO,
      endDate: endISO,
    });
  };
  const onEventResize = (ev, slotId, start, end) => {
    const startISO = moment(start).format();
    const endISO = moment(end).format();
    updateBooking(ev.id, {
      startDate: startISO,
      endDate: endISO,
    });
  };

  // Handle double-click (open edit modal)
  const onEventDoubleClick = (schedulerData, event) => {
    const start = moment(event.start).format('YYYY-MM-DD');
    const end = moment(event.end).format('YYYY-MM-DD');
    setSelectedRoom(event.resourceId);
    setBookingStart(start);
    setBookingEnd(end);
    setSelectedGuest(event.guestId);
    setGuestSearch(event.title);
    setFormError('');
    setIsEditing(true);
    setEditingEventId(event.id);
    setNewGuestMode(false);
    setNewGuestName('');
    setNewGuestEmail('');
    setNewGuestPhone('');
    setNewGuestError('');
    setBookingModalVisible(true);
  };

  // Scheduler callbacks for view and date changes
  const onViewChange = (newView) => {
    schedulerData.setViewType(
      +newView.viewType,
      newView.showAgenda,
      +newView.isEventPerspective
    );
    setSchedulerData(schedulerData);
  };
  const onSelectDate = (date) => {
    schedulerData.setDate(date);
    setSchedulerData(schedulerData);
  };

  /**
   * Custom event item renderer that adds:
   *  - a colored left border (bgColor),
   *  - the guest’s name,
   *  - a tiny “✎” edit icon in the corner,
   *  - onDoubleClick for editing,
   *  - a title attribute for simple tooltip.
   */
  const eventItemTemplateResolver = (
    schedulerData,
    event,
    bgColor,
    isStart,
    isEnd,
    mustAddCssClass,
    mustBeHeight,
    agendaMaxEventWidth
  ) => {
    const borderWidth = isStart ? 4 : 1;
    return (
      <div
        key={event.id}
        className={mustAddCssClass || ''}
        title={`Guest: ${event.title}\nCheck‐In: ${moment(
          event.start
        ).format('YYYY-MM-DD')}\nCheck‐Out: ${moment(event.end).format(
          'YYYY-MM-DD'
        )}`}
        style={{
          borderLeft: `${borderWidth}px solid ${bgColor}`,
          backgroundColor: bgColor,
          height: mustBeHeight,
          maxWidth: agendaMaxEventWidth,
          padding: '2px',
          position: 'relative',
          cursor: 'pointer',
        }}
        onDoubleClick={() => onEventDoubleClick(schedulerData, event)}
      >
        <span style={{ paddingRight: '16px' }}>{event.title}</span>
        <span
          style={{
            position: 'absolute',
            right: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          ✎
        </span>
      </div>
    );
  };

  /**
   * Custom popover renderer for hover:
   * Shows guest full profile, total nights, and notes.
   */
  const eventItemPopoverTemplateResolver = (
    schedulerData,
    event,
    start,
    end,
    status,
    style
  ) => {
    // Remove numeric keys from style to avoid React style errors
    const cleanedStyle = {};
    if (style && typeof style === 'object') {
      Object.keys(style).forEach((key) => {
        if (!/^\d+$/.test(key)) {
          cleanedStyle[key] = style[key];
        }
      });
    }

    return (
      <div
        className="p-2 bg-white rounded shadow"
        style={{
          minWidth: '200px',
          ...cleanedStyle,
        }}
      >
        <div className="font-semibold mb-1">{event.title}</div>
        <div className="text-sm mb-1">
          <strong>Email:</strong> {event.guestEmail}
        </div>
        <div className="text-sm mb-1">
          <strong>Phone:</strong> {event.guestPhone}
        </div>
        <div className="text-sm mb-1">
          <strong>Check‐In:</strong> {moment(event.start).format('YYYY-MM-DD')}
        </div>
        <div className="text-sm mb-1">
          <strong>Check‐Out:</strong> {moment(event.end).format('YYYY-MM-DD')}
        </div>
        <div className="text-sm mb-1">
          <strong>Total Nights:</strong> {event.nights}
        </div>
        {event.notes && (
          <div className="text-sm">
            <strong>Notes:</strong> {event.notes}
          </div>
        )}
      </div>
    );
  };

  // Filter guests based on search term
  const filteredGuests = guests.filter((g) =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase())
  );

  // Handle creating a new guest
  const handleAddNewGuest = async () => {
    setNewGuestError('');
    if (!newGuestName.trim()) {
      return setNewGuestError('Name is required.');
    }
    if (!newGuestEmail.trim()) {
      return setNewGuestError('Email is required.');
    }
    try {
      const newGuest = await fetchJSON('/api/guests', {
        method: 'POST',
        body: JSON.stringify({
          name: newGuestName,
          email: newGuestEmail,
          phone: newGuestPhone,
        }),
      });
      // Update guests list and select the new guest
      setGuests((prev) => [...prev, newGuest]);
      setSelectedGuest(newGuest.id);
      setGuestSearch(newGuest.name);
      setNewGuestMode(false);
      setNewGuestName('');
      setNewGuestEmail('');
      setNewGuestPhone('');
      setShowGuestSuggestions(false);
    } catch (err) {
      console.error('Failed to add new guest:', err);
      setNewGuestError(err.message);
    }
  };

  return (
    <div className="p-4 relative">
      <h1 className="text-2xl font-bold mb-4">Booking Calendar</h1>

      <div className="mb-4">
        <label className="mr-2 font-semibold">Select Hotel:</label>
        <select
          className="border px-2 py-1 rounded"
          value={selectedHotel || ''}
          onChange={(e) => setSelectedHotel(e.target.value)}
        >
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      <Scheduler
        schedulerData={schedulerData}
        resources={resources}
        events={events}
        onViewChange={onViewChange}
        onSelectDate={onSelectDate}
        moveEvent={onEventMove}
        newEvent={onSelectSlot}
        updateEventStart={onEventResize}
        updateEventEnd={onEventResize}
        eventItemTemplateResolver={eventItemTemplateResolver}
        eventItemPopoverTemplateResolver={eventItemPopoverTemplateResolver}
      />

      {/* Booking Modal */}
      {bookingModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96 relative">
            <h2 className="text-xl font-semibold mb-4">
              {isEditing ? 'Edit Booking' : 'New Booking'}
            </h2>
            {formError && <div className="text-red-600 mb-2">{formError}</div>}
            <form onSubmit={handleBookingSubmit} className="space-y-4">
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
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative" ref={guestInputRef}>
                <label className="block font-medium">Guest:</label>
                {!newGuestMode && (
                  <>
                    <input
                      type="text"
                      className="w-full border px-2 py-1 rounded"
                      placeholder="Search guest..."
                      value={guestSearch}
                      onChange={(e) => {
                        setGuestSearch(e.target.value);
                        setShowGuestSuggestions(true);
                        setSelectedGuest('');
                      }}
                      onFocus={() => setShowGuestSuggestions(true)}
                    />
                    {showGuestSuggestions && (
                      <ul className="absolute z-20 bg-white border w-full max-h-40 overflow-y-auto rounded mt-1 shadow">
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
                            {g.name} ({g.email})
                          </li>
                        ))}
                        <li
                          className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-blue-600"
                          onClick={() => {
                            setNewGuestMode(true);
                            setShowGuestSuggestions(false);
                          }}
                        >
                          + Add new guest
                        </li>
                      </ul>
                    )}
                  </>
                )}
                {newGuestMode && (
                  <div className="space-y-2 pt-2">
                    {newGuestError && (
                      <div className="text-red-600">{newGuestError}</div>
                    )}
                    <input
                      type="text"
                      className="w-full border px-2 py-1 rounded"
                      placeholder="Guest Name"
                      value={newGuestName}
                      onChange={(e) => setNewGuestName(e.target.value)}
                    />
                    <input
                      type="email"
                      className="w-full border px-2 py-1 rounded"
                      placeholder="Guest Email"
                      value={newGuestEmail}
                      onChange={(e) => setNewGuestEmail(e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-full border px-2 py-1 rounded"
                      placeholder="Guest Phone"
                      value={newGuestPhone}
                      onChange={(e) => setNewGuestPhone(e.target.value)}
                    />
                    <div className="flex justify-between">
                      <button
                        type="button"
                        className="text-sm text-gray-600 hover:underline"
                        onClick={() => {
                          setNewGuestMode(false);
                          setNewGuestName('');
                          setNewGuestEmail('');
                          setNewGuestPhone('');
                          setNewGuestError('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                        onClick={handleAddNewGuest}
                      >
                        Save Guest
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium">Check-In:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={bookingStart}
                  onChange={(e) => setBookingStart(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-medium">Check-Out:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={bookingEnd}
                  onChange={(e) => setBookingEnd(e.target.value)}
                />
              </div>

              <div className="flex justify-between">
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
                {!newGuestMode && (
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
      )}
    </div>
  );
});
