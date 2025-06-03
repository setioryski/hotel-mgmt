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

// Inline CSS overrides to ensure mobile taps register and prevent text selection
const CELL_CSS_OVERRIDES = {
  touchAction: 'manipulation',
  userSelect: 'none',
};

// Style for blocked cell overlay
const BLOCKED_CELL_STYLE = `
  .blocked-cell {
    position: relative;
    background-color: rgba(0, 0, 0, 0.2) !important;
    pointer-events: none;
  }
  .blocked-cell::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.5);
    z-index: 1;
  }
`;

export default DragDropContext(HTML5Backend)(function CalendarScheduler() {
  //
  // 1) Initialize SchedulerData with headerDisabled so that built-in header/nav is hidden
  //
  const [schedulerData, setSchedulerData] = useState(() => {
    const sd = new SchedulerData(
      moment().format(DATE_FORMAT),
      ViewTypes.Month,
      false, // showAgenda = false
      false, // isEventPerspective = false
      {
        minuteStep: 30,
        headerEnabled: false, // disable built-in header (prev/next, datepicker, radio)
      }
    );
    return sd;
  });

  const [resources, setResources] = useState([]);
  const [allRooms, setAllRooms] = useState([]); // store raw rooms for filtering
  const [events, setEvents] = useState([]);

  // Hotel selector
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);

  // Room-Type Filter
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoomType, setSelectedRoomType] = useState('all');

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

  // Edit current guest form state
  const [editingGuestMode, setEditingGuestMode] = useState(false);
  const [editingGuestName, setEditingGuestName] = useState('');
  const [editingGuestEmail, setEditingGuestEmail] = useState('');
  const [editingGuestPhone, setEditingGuestPhone] = useState('');
  const [editingGuestError, setEditingGuestError] = useState('');

  // Booking modal state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  // Form fields
  const [selectedRoom, setSelectedRoom] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [formError, setFormError] = useState('');

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Track the cell we clicked to block/unblock
  const [blockedCell, setBlockedCell] = useState(null);

  const guestInputRef = useRef();

  // Track current view type (Month / Week / Day)
  const [currentView, setCurrentView] = useState(ViewTypes.Month);

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

  //
  // 2) Load hotels on mount
  //
  useEffect(() => {
    fetchJSON('/api/hotels')
      .then((data) => {
        setHotels(data);
        if (data.length) setSelectedHotel(data[0].id);
      })
      .catch((err) => console.error('Failed to load hotels:', err));
  }, []);

  //
  // 3) Load guests on mount
  //
  useEffect(() => {
    fetchJSON('/api/guests')
      .then((data) => setGuests(data))
      .catch((err) => console.error('Failed to load guests:', err));
  }, []);

  //
  // 4) Fetch rooms & bookings whenever selectedHotel or roomType changes
  //
  const loadData = () => {
    if (!selectedHotel) return;
    setIsLoading(true);

    Promise.all([
      fetchJSON(`/api/rooms?hotel=${selectedHotel}`),
      fetchJSON(`/api/bookings?hotel=${selectedHotel}`),
    ])
      .then(([roomsResponse, bookingsResponse]) => {
        // Normalize rooms
        const rooms = Array.isArray(roomsResponse)
          ? roomsResponse
          : roomsResponse.data || [];
        setAllRooms(rooms);

        // Derive unique room types
        const types = Array.from(new Set(rooms.map((r) => r.type))).sort();
        setRoomTypes(types);

        // Filter by selected room type
        const filteredRoomsData = rooms.filter(
          (r) => selectedRoomType === 'all' || r.type === selectedRoomType
        );

        // Map to scheduler resources
        const resourceList = filteredRoomsData.map((r) => ({
          id: r.id,
          name: `Room ${r.number} (${r.type})`,
        }));

        // Normalize bookings
        const bookings = Array.isArray(bookingsResponse)
          ? bookingsResponse
          : Array.isArray(bookingsResponse.data)
          ? bookingsResponse.data
          : [];

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
              id: id,
              resourceId: roomId,
              title: title,
              start: startMoment.format(DATE_FORMAT),
              end: endMoment.format(DATE_FORMAT),
              bgColor: b.bgColor || '#3B82F6', // default confirmed color
              guestEmail: guestObj.email || '',
              guestPhone: guestObj.phone || '',
              notes: b.notes || '',
              nights: nights,
              guestId: guestObj.id || null,
              status: b.status,
            };
          })
          .filter(Boolean);

        // Apply to schedulerData
        const sd = schedulerData;
        sd.setResources(resourceList);
        sd.setEvents(eventList);

        setResources(resourceList);
        setEvents(eventList);
        setSchedulerData(sd);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
        setIsLoading(false);
      });
  };

  // Trigger loadData when hotel or room type changes
  useEffect(loadData, [selectedHotel, selectedRoomType]);

  //
  // 5) Close guest autocomplete suggestions on outside click
  //
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
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  //
  // 6) OPEN BOOKING MODAL when clicking an empty cell
  //    Also block the clicked cell
  //
  const onSelectSlot = (schedulerData, slotId, slotName, start, end) => {
    const startDate = moment(start).format('YYYY-MM-DD');
    const endDate = moment(end).format('YYYY-MM-DD');
    setSelectedRoom(slotId);
    setBookingStart(startDate);
    setBookingEnd(endDate);
    setSelectedGuest('');
    setGuestSearch('');
    setNewGuestMode(false);
    setEditingGuestMode(false);
    setFormError('');
    setIsEditing(false);
    setEditingEventId(null);
    setBookingModalVisible(true);

    // Block the clicked cell
    setBlockedCell({ slotId, start, end });
  };

  //
  // 7) SUBMIT NEW OR UPDATE BOOKING:
  //
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
        // UPDATE existing booking
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
        // CREATE new booking
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

      // Close modal and unblock the cell
      closeModal();
      loadData();
    } catch (err) {
      console.error('Booking operation failed:', err);
      setFormError(err.message);
    }
  };

  //
  // 8) CANCEL BOOKING from within modal:
  //
  const handleCancelBooking = async () => {
    if (!editingEventId) return;
    if (!window.confirm('Are you sure you want to cancel this booking?'))
      return;
    try {
      await fetchJSON(`/api/bookings/${editingEventId}`, { method: 'DELETE' });
      // Close modal and unblock
      closeModal();
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
    setEditingGuestMode(false);
    setNewGuestName('');
    setNewGuestEmail('');
    setNewGuestPhone('');
    setNewGuestError('');
    setEditingGuestName('');
    setEditingGuestEmail('');
    setEditingGuestPhone('');
    setEditingGuestError('');

    // Unblock the cell if any
    if (blockedCell) {
      const { slotId, start, end } = blockedCell;
      const selector = `.rbs-cell[data-slot-id="${slotId}"][data-start="${start}"][data-end="${end}"]`;
      const cellEl = document.querySelector(selector);
      if (cellEl) cellEl.classList.remove('blocked-cell');
      setBlockedCell(null);
    }
  };

  //
  // 9) UPDATE BOOKING when dragging/resizing:
  //
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

  //
  // 10) DOUBLE-CLICK on an existing event to open “Edit” modal:
  //
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
    setEditingGuestMode(false);
    setNewGuestName('');
    setNewGuestEmail('');
    setNewGuestPhone('');
    setNewGuestError('');
    setEditingGuestName('');
    setEditingGuestEmail('');
    setEditingGuestPhone('');
    setEditingGuestError('');
    setBookingModalVisible(true);

    // Block the clicked cell for editing
    setBlockedCell({ slotId: event.resourceId, start: event.start, end: event.end });
  };

  //
  // 11) VIEW & DATE CHANGE CALLBACKS (re-apply resources+events):
  //
  const onViewChange = (newView) => {
    schedulerData.setViewType(
      +newView.viewType,
      newView.showAgenda,
      +newView.isEventPerspective
    );
    schedulerData.setResources(resources);
    schedulerData.setEvents(events);
    setSchedulerData(schedulerData);
    setCurrentView(+newView.viewType);
  };
  const onSelectDate = (date) => {
    schedulerData.setDate(date);
    schedulerData.setResources(resources);
    schedulerData.setEvents(events);
    setSchedulerData(schedulerData);
  };

  //
  // 12) PREV & NEXT navigation:
  //
  const onPrev = () => {
    schedulerData.prev();
    schedulerData.setResources(resources);
    schedulerData.setEvents(events);
    setSchedulerData(schedulerData);
  };
  const onNext = () => {
    schedulerData.next();
    schedulerData.setResources(resources);
    schedulerData.setEvents(events);
    setSchedulerData(schedulerData);
  };

  //
  // 13) RENDER EVENT ITEM
  //
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
        title={`Guest: ${event.title}\nCheck-In: ${moment(
          event.start
        ).format('YYYY-MM-DD')}\nCheck-Out: ${moment(event.end).format(
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

  //
  // 14) CUSTOM POPOVER on hover/long-press
  //
  const eventItemPopoverTemplateResolver = (
    schedulerData,
    event,
    start,
    end,
    status,
    style
  ) => {
    const cleanedStyle = {};
    if (style && typeof style === 'object') {
      Object.keys(style).forEach((key) => {
        if (!/^\d+$/.test(key)) cleanedStyle[key] = style[key];
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
          <strong>Check-In:</strong> {moment(event.start).format('YYYY-MM-DD')}
        </div>
        <div className="text-sm mb-1">
          <strong>Check-Out:</strong>{' '}
          {moment(event.end).format('YYYY-MM-DD')}
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

  //
  // 15) FILTER GUESTS FOR AUTOCOMPLETE
  //
  const filteredGuests = guests.filter((g) =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase())
  );

  //
  // 16) ADD NEW GUEST
  //
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

  //
  // 17) OPEN EDIT CURRENT GUEST
  //
  const openGuestEdit = () => {
    if (!selectedGuest) return;
    const guest = guests.find((g) => g.id === selectedGuest);
    if (!guest) return;
    setEditingGuestName(guest.name || '');
    setEditingGuestEmail(guest.email || '');
    setEditingGuestPhone(guest.phone || '');
    setEditingGuestError('');
    setEditingGuestMode(true);
  };

  //
  // 18) SUBMIT GUEST UPDATE
  //
  const handleGuestUpdate = async () => {
    setEditingGuestError('');
    if (!editingGuestName.trim()) {
      return setEditingGuestError('Name is required.');
    }
    if (!editingGuestEmail.trim()) {
      return setEditingGuestError('Email is required.');
    }
    try {
      const updated = await fetchJSON(`/api/guests/${selectedGuest}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingGuestName,
          email: editingGuestEmail,
          phone: editingGuestPhone,
        }),
      });
      // Update local guests array
      setGuests((prev) =>
        prev.map((g) => (g.id === selectedGuest ? updated : g))
      );
      setEditingGuestMode(false);
      setGuestSearch(updated.name);
    } catch (err) {
      console.error('Failed to update guest:', err);
      setEditingGuestError(err.message);
    }
  };

  //
  // 19) CATCH MOBILE TAPS on empty cell: climb DOM to find .rbs-cell
  //
  const schedulerWrapperRef = useRef(null);

  const handleTouchEnd = (e) => {
    let cell = e.target;
    while (cell && !cell.classList.contains('rbs-cell')) {
      cell = cell.parentElement;
    }
    if (cell) {
      const slotId = cell.getAttribute('data-slot-id');
      const start = cell.getAttribute('data-start');
      const end = cell.getAttribute('data-end');
      if (slotId && start && end) {
        onSelectSlot(schedulerData, slotId, null, start, end);
      }
    }
  };

  //
  // 20) APPLY BLOCKED CELL CLASS when blockedCell state changes
  //
  useEffect(() => {
    if (!blockedCell) return;

    const { slotId, start, end } = blockedCell;
    const selector = `.rbs-cell[data-slot-id="${slotId}"][data-start="${start}"][data-end="${end}"]`;
    const cellEl = document.querySelector(selector);
    if (cellEl) {
      cellEl.classList.add('blocked-cell');
    }
  }, [blockedCell]);

  return (
    <div className="p-4 relative">
      {/* Inject blocked-cell CSS */}
      <style>{BLOCKED_CELL_STYLE}</style>

      <h1 className="text-2xl font-bold mb-4">Booking Calendar</h1>

      {/* Toolbar: Hotel, Room Type, Prev/Next, View Toggle */}
      <div className="flex flex-wrap items-center mb-4 space-x-4">
        <div>
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

        <div>
          <label className="mr-2 font-semibold">Room Type:</label>
          <select
            className="border px-2 py-1 rounded"
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value)}
          >
            <option value="all">All</option>
            {roomTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex space-x-2">
          <button
            className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
            onClick={onPrev}
          >
            &#8592;
          </button>
          <button
            className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
            onClick={onNext}
          >
            &#8594;
          </button>
        </div>

        <div className="flex space-x-2">
          <select
            className="border px-2 py-1 rounded"
            value={currentView}
            onChange={(e) =>
              onViewChange({
                viewType: e.target.value,
                showAgenda: false,
                isEventPerspective: 0,
              })
            }
          >
            <option value={ViewTypes.Month}>Month</option>
            <option value={ViewTypes.Week}>Week</option>
            <option value={ViewTypes.Day}>Day</option>
          </select>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        // Wrapper for mobile taps
        <div
          ref={schedulerWrapperRef}
          style={CELL_CSS_OVERRIDES}
          onTouchEnd={handleTouchEnd}
        >
          <Scheduler
            schedulerData={schedulerData}
            resources={resources}
            events={events}
            onViewChange={onViewChange}
            onSelectDate={onSelectDate}
            moveEvent={onEventMove}
            newEvent={onSelectSlot}            // click (desktop) => new booking
            updateEventStart={onEventResize}
            updateEventEnd={onEventResize}
            eventItemTemplateResolver={eventItemTemplateResolver}
            eventItemPopoverTemplateResolver={
              eventItemPopoverTemplateResolver
            }
          />
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 p-2 bg-white border rounded shadow text-sm">
        <strong>Legend:</strong>
        <div className="flex space-x-4 mt-1">
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-blue-500 inline-block rounded"></span>
            <span>Confirmed</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-gray-600 inline-block rounded"></span>
            <span>Cancelled</span>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {bookingModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96 relative">
            <h2 className="text-xl font-semibold mb-4">
              {isEditing ? 'Edit Booking' : 'New Booking'}
            </h2>
            {formError && (
              <div className="text-red-600 mb-2">{formError}</div>
            )}
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              {/* Room selection */}
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

              {/* Guest autocomplete/new/add/edit */}
              <div className="relative" ref={guestInputRef}>
                <label className="block font-medium mb-1">Guest:</label>

                {!newGuestMode && !editingGuestMode && (
                  <>
                    <input
                      type="text"
                      className="w-full border px-2 py-1 rounded mb-1"
                      placeholder="Search guest..."
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
                    {selectedGuest && (
                      <button
                        type="button"
                        className="text-sm text-blue-600 mb-2 hover:underline"
                        onClick={openGuestEdit}
                      >
                        Edit Selected Guest
                      </button>
                    )}
                    {showGuestSuggestions && (
                      <ul className="absolute z-20 bg-white border w-full max-h-40 overflow-y-auto rounded mt-1 shadow">
                        {/* + Add new guest appears first */}
                        <li
                          className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-blue-600"
                          onClick={() => {
                            setNewGuestMode(true);
                            setShowGuestSuggestions(false);
                            setEditingGuestMode(false);
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
                            {g.name} ({g.email})
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {/* New Guest Form */}
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

                {/* Edit Guest Form */}
                {editingGuestMode && selectedGuest && (
                  <div className="space-y-2 pt-2">
                    {editingGuestError && (
                      <div className="text-red-600">{editingGuestError}</div>
                    )}
                    <input
                      type="text"
                      className="w-full border px-2 py-1 rounded"
                      placeholder="Guest Name"
                      value={editingGuestName}
                      onChange={(e) => setEditingGuestName(e.target.value)}
                    />
                    <input
                      type="email"
                      className="w-full border px-2 py-1 rounded"
                      placeholder="Guest Email"
                      value={editingGuestEmail}
                      onChange={(e) => setEditingGuestEmail(e.target.value)}
                    />
                    <input
                      type="text"
                      className="w-full border px-2 py-1 rounded"
                      placeholder="Guest Phone"
                      value={editingGuestPhone}
                      onChange={(e) => setEditingGuestPhone(e.target.value)}
                    />
                    <div className="flex justify-between">
                      <button
                        type="button"
                        className="text-sm text-gray-600 hover:underline"
                        onClick={() => {
                          setEditingGuestMode(false);
                          setEditingGuestName('');
                          setEditingGuestEmail('');
                          setEditingGuestPhone('');
                          setEditingGuestError('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                        onClick={handleGuestUpdate}
                      >
                        Update Guest
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Check-In date */}
              <div>
                <label className="block font-medium">Check-In:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={bookingStart}
                  onChange={(e) => setBookingStart(e.target.value)}
                />
              </div>

              {/* Check-Out date */}
              <div>
                <label className="block font-medium">Check-Out:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={bookingEnd}
                  onChange={(e) => setBookingEnd(e.target.value)}
                />
              </div>

              {/* Booking modal buttons */}
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
      )}
    </div>
  );
});
