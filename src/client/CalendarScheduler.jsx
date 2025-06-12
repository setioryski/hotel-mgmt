// src/client/CalendarScheduler.jsx
import React, { useState, useEffect, useRef } from 'react';
import Scheduler, { SchedulerData, ViewTypes, DATE_FORMAT } from 'react-big-scheduler';
import moment from 'moment';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import 'react-big-scheduler/lib/css/style.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Prevent mobile text selection & allow taps
const CELL_CSS_OVERRIDES = {
  touchAction: 'manipulation',
  userSelect: 'none',
};

// Reusable confirmation modal for critical actions
const ConfirmModal = ({ visible, title, message, onConfirm, onCancel }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-80">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <p className="mb-4">{message}</p>
        <div className="flex justify-end space-x-2">
          <button onClick={onCancel} className="px-4 py-2 rounded border">No</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 text-white">Yes</button>
        </div>
      </div>
    </div>
  );
};

function CalendarScheduler() {
  // Scheduler Data
  const [schedulerData, setSchedulerData] = useState(() => {
    const sd = new SchedulerData(
      moment().format(DATE_FORMAT),
      ViewTypes.Month,
      false,
      false,
      { minuteStep: 30, headerEnabled: false }
    );
    return sd;
  });

  // Core lists & filters
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoomType, setSelectedRoomType] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isBlockMode, setIsBlockMode] = useState(false);
  const [currentView, setCurrentView] = useState(ViewTypes.Month);

  // Guest autocomplete & inline add/edit states
  const [guests, setGuests] = useState([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState('');
  const [newGuestMode, setNewGuestMode] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [newGuestError, setNewGuestError] = useState('');
  const [editingGuestMode, setEditingGuestMode] = useState(false);
  const [editingGuestName, setEditingGuestName] = useState('');
  const [editingGuestEmail, setEditingGuestEmail] = useState('');
  const [editingGuestPhone, setEditingGuestPhone] = useState('');
  const [editingGuestError, setEditingGuestError] = useState('');

  // Booking modal & form states
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [bookingStatus, setBookingStatus] = useState('tentative');
  const [bookingFormError, setBookingFormError] = useState('');

  // Block modal & form states
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [isEditingBlock, setIsEditingBlock] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [blockRoom, setBlockRoom] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockFormError, setBlockFormError] = useState('');

  // Confirm modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmCallback, setConfirmCallback] = useState(() => {});

  // Refs
  const guestInputRef = useRef();
  const schedulerWrapperRef = useRef(null);

  // Helper: fetch JSON and throw on error
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

  // Show confirm modal
  const showConfirm = (message, callback, title = '') => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => callback);
    setConfirmModalVisible(true);
  };
  const handleConfirmYes = () => {
    confirmCallback();
    setConfirmModalVisible(false);
  };
  const handleConfirmNo = () => {
    setConfirmModalVisible(false);
  };

  // Load hotels on mount
  useEffect(() => {
    fetchJSON('/api/hotels')
      .then((data) => {
        setHotels(data);
        if (data.length) setSelectedHotel(data[0].id);
      })
      .catch((err) => console.error('Load hotels failed:', err));
  }, []);

  // Load guests on mount
  useEffect(() => {
    fetchJSON('/api/guests')
      .then(setGuests)
      .catch((err) => console.error('Load guests failed:', err));
  }, []);

  // Fetch & normalize rooms/bookings/blocks when hotel/type changes
  const loadData = async () => {
    if (!selectedHotel) return;
    setIsLoading(true);
    try {
      const [roomsResp, bookingsResp, blocksResp] = await Promise.all([
        fetchJSON(`/api/rooms?hotel=${selectedHotel}`),
        fetchJSON(`/api/bookings?hotel=${selectedHotel}`),
        fetchJSON(`/api/blocks?hotel=${selectedHotel}`),
      ]);

      const rooms = Array.isArray(roomsResp) ? roomsResp : roomsResp.data || [];
      setRoomTypes(Array.from(new Set(rooms.map((r) => r.type))).sort());

      const filteredRooms = rooms.filter(
        (r) => selectedRoomType === 'all' || r.type === selectedRoomType
      );
      const resourceList = filteredRooms.map((r) => ({
        id: r.id,
        number: r.number,
        name: (
          <span
            onClick={(e) => {
              e.stopPropagation();
              toggleBlockAll(r.id);
            }}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >{`Room ${r.number} (${r.type})`}</span>
        ),
      }));

      const bookingEvents = (Array.isArray(bookingsResp)
        ? bookingsResp
        : bookingsResp.data || []
      ).map((e) => {
        let bgColor = '#3B82F6';
        if (e.status === 'tentative') bgColor = '#FBBF24';
        else if (e.status === 'checkedin') bgColor = '#10B981';
        else if (e.status === 'checkedout') bgColor = '#EF4444';
        return {
          id: e.id,
          resourceId: e.resourceId,
          title: e.title,
          start: moment(e.start).format(DATE_FORMAT),
          end: moment(e.end).format(DATE_FORMAT),
          bgColor,
          status: e.status,
          guestId: e.guestId,
          type: 'booking',
        };
      });

      const blockEvents = (Array.isArray(blocksResp)
        ? blocksResp
        : blocksResp.data || []
      ).map((b) => ({
        id: b.id,
        resourceId: b.resourceId,
        title: b.title || 'Blocked',
        start: moment(b.start).format(DATE_FORMAT),
        end: moment(b.end).format(DATE_FORMAT),
        bgColor: '#999999',
        type: 'block',
      }));

      const sd = schedulerData;
      sd.setResources(resourceList);
      sd.setEvents([...bookingEvents, ...blockEvents]);

      setResources(resourceList);
      setEvents([...bookingEvents, ...blockEvents]);
      setSchedulerData(sd);
    } catch (err) {
      console.error('Load data failed:', err);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, [selectedHotel, selectedRoomType]);

  // Hide guest suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (guestInputRef.current && !guestInputRef.current.contains(e.target)) {
        setShowGuestSuggestions(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter guests for autocomplete
  const filteredGuests = guests.filter((g) =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase())
  );

  // Add new guest
  const handleAddNewGuest = async () => {
    if (!newGuestName) {
      return setNewGuestError('Name is required');
    }
    try {
      const created = await fetchJSON('/api/guests', {
        method: 'POST',
        body: JSON.stringify({
          name: newGuestName,
          email: newGuestEmail,
          phone: newGuestPhone,
        }),
      });
      setGuests((prev) => [...prev, created]);
      setSelectedGuest(created.id);
      setGuestSearch(created.name);
      setNewGuestMode(false);
      toast.success('Guest added');
    } catch (err) {
      console.error('Add guest failed:', err);
      setNewGuestError(err.message);
    }
  };

  // Edit existing guest
  const openGuestEdit = (guest) => {
    setEditingGuestMode(true);
    setEditingGuestName(guest.name);
    setEditingGuestEmail(guest.email);
    setEditingGuestPhone(guest.phone);
    setEditingGuestError('');
  };
  const handleGuestUpdate = async () => {
    if (!editingGuestName) {
      return setEditingGuestError('Name is required');
    }
    try {
      await fetchJSON(`/api/guests/${selectedGuest}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingGuestName,
          email: editingGuestEmail,
          phone: editingGuestPhone,
        }),
      });
      setGuests((prev) =>
        prev.map((g) =>
          g.id === selectedGuest
            ? {
                ...g,
                name: editingGuestName,
                email: editingGuestEmail,
                phone: editingGuestPhone,
              }
            : g
        )
      );
      setGuestSearch(editingGuestName);
      setEditingGuestMode(false);
      toast.success('Guest updated');
    } catch (err) {
      console.error('Update guest failed:', err);
      setEditingGuestError(err.message);
    }
  };

  // Handle slot selection: block or booking
  const onSelectSlot = (sd, slotId, slotName, start, end) => {
    const startDate = moment(start).format('YYYY-MM-DD');

    if (isBlockMode) {
      const endDate = moment(end).format('YYYY-MM-DD');
      setBlockRoom(slotId);
      setBlockStart(startDate);
      setBlockEnd(endDate);
      setBlockReason('');
      setBlockFormError('');
      setIsEditingBlock(false);
      setEditingBlockId(null);
      setBlockModalVisible(true);
    } else {
      const overlap = events.find(
        (ev) =>
          ev.type === 'block' &&
          ev.resourceId === slotId &&
          moment(start).isBefore(ev.end) &&
          moment(end).isAfter(ev.start)
      );
      if (overlap) {
        toast.error(
          `Cannot book: this room is blocked from ${moment(overlap.start).format(
            'YYYY-MM-DD'
          )} to ${moment(overlap.end).format('YYYY-MM-DD')}`
        );
        return;
      }

      setSelectedRoom(slotId);
      setBookingStart(startDate);
      setBookingEnd(moment(start).add(1, 'days').format('YYYY-MM-DD'));
      setSelectedGuest('');
      setGuestSearch('');
      setBookingStatus('tentative');
      setBookingFormError('');
      setIsEditingBooking(false);
      setEditingBookingId(null);
      setNewGuestMode(false);
      setEditingGuestMode(false);
      setBookingModalVisible(true);

      setTimeout(() => {
        const input = guestInputRef.current?.querySelector('input');
        if (input) {
          input.focus();
          setShowGuestSuggestions(true);
        }
      }, 0);
    }
  };

  // Update booking on drag/resize
  const updateBooking = (id, body) =>
    fetchJSON(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
      .then(loadData)
      .catch((err) => console.error('Booking update failed:', err));

  const onEventMove = (ev, slotId, start, end) => {
    if (ev.type === 'booking') {
      updateBooking(ev.id, {
        room: slotId,
        startDate: moment(start).format(),
        endDate: moment(end).format(),
        status: ev.status,
      });
    }
  };
  const onEventResize = (ev, slotId, start, end) => {
    if (ev.type === 'booking') {
      updateBooking(ev.id, {
        startDate: moment(start).format(),
        endDate: moment(end).format(),
        status: ev.status,
      });
    }
  };

  // Render each event item
  const eventItemTemplateResolver = (
    sd,
    event,
    start,
    end,
    status,
    style
  ) => {
    const borderWidth = status === 'start' ? 4 : 1;
    const mustBeHeight = status === 'start' ? 28 : 22;
    return (
      <div
        key={event.id}
        title={
          event.type === 'booking'
            ? `Guest: ${event.title}\nCheck-In: ${moment(event.start).format('YYYY-MM-DD')}\nCheck-Out: ${moment(
                event.end
              ).format('YYYY-MM-DD')}\nStatus: ${event.status}`
            : `Block: ${event.title}\nFrom: ${moment(event.start).format('YYYY-MM-DD')}\nTo: ${moment(
                event.end
              ).format('YYYY-MM-DD')}`
        }
        style={{
          borderLeft: `${borderWidth}px solid ${event.bgColor}`,
          backgroundColor: event.bgColor,
          height: mustBeHeight,
          maxWidth: 999,
          padding: '2px',
          position: 'relative',
          cursor: 'pointer',
          color: '#fff',
        }}
        onDoubleClick={() => onEventDoubleClick(sd, event)}
      >
        <span style={{ paddingRight: '16px' }}>{event.title}</span>
        {event.type === 'booking' && (
          <span
            style={{
              position: 'absolute',
              right: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '12px',
            }}
          >
            ✎
          </span>
        )}
      </div>
    );
  };

  // Hover popover
  const eventItemPopoverTemplateResolver = (
    sd,
    event,
    start,
    end,
    status,
    style
  ) => {
    const cleanedStyle = {};
    if (style && typeof style === 'object') {
      Object.keys(style).forEach((k) => {
        if (!/^\d+$/.test(k)) cleanedStyle[k] = style[k];
      });
    }
    return (
      <div className="p-2 bg-white rounded shadow" style={{ minWidth: '200px', ...cleanedStyle }}>
        {event.type === 'booking' ? (
          <>
            <div className="font-semibold mb-1">{event.title}</div>
            <div className="text-sm mb-1">
              <strong>Status:</strong> {event.status}
            </div>
            <div className="text-sm">
              <strong>Guest ID:</strong> {event.guestId}
            </div>
          </>
        ) : (
          <>
            <div className="font-semibold mb-1">Blocked</div>
            <div className="text-sm mb-1">
              <strong>Reason:</strong> {event.title}
            </div>
            <div className="text-sm mb-1">
              <strong>From:</strong> {moment(event.start).format('YYYY-MM-DD')}
            </div>
            <div className="text-sm">
              <strong>To:</strong> {moment(event.end).format('YYYY-MM-DD')}
            </div>
          </>
        )}
      </div>
    );
  };

  // Toggle block-all dates
  const toggleBlockAll = async (roomId) => {
    const existing = events.find((ev) => ev.resourceId === roomId && ev.title === 'All Dates');
    try {
      if (existing) {
        await fetchJSON(`/api/blocks/${existing.id}`, { method: 'DELETE' });
        toast.success('All-dates block removed');
      } else {
        await fetchJSON('/api/blocks', {
          method: 'POST',
          body: JSON.stringify({
            room: roomId,
            startDate: '1900-01-01T00:00:00',
            endDate: '2999-12-31T23:59:59',
            reason: 'All Dates',
          }),
        });
        toast.success('Room blocked for all dates');
      }
      loadData();
    } catch (err) {
      console.error('Toggle block-all failed:', err);
      toast.error('Failed to toggle block-all');
    }
  };

  // Double-click edit
  const onEventDoubleClick = (sd, event) => {
    if (event.type === 'booking') {
      setSelectedRoom(event.resourceId);
      setBookingStart(moment(event.start).format('YYYY-MM-DD'));
      setBookingEnd(moment(event.end).format('YYYY-MM-DD'));
      setBookingStatus(event.status);
      setBookingFormError('');
      setSelectedGuest(event.guestId || '');
      setGuestSearch(event.title || '');
      setShowGuestSuggestions(false);
      setIsEditingBooking(true);
      setEditingBookingId(event.id);
      setNewGuestMode(false);
      setEditingGuestMode(false);
      setBookingModalVisible(true);
      setTimeout(() => {
        const input = guestInputRef.current?.querySelector('input');
        if (input) {
          input.focus();
          setShowGuestSuggestions(true);
        }
      }, 0);
    } else {
      setBlockRoom(event.resourceId);
      setBlockStart(moment(event.start).format('YYYY-MM-DD'));
      setBlockEnd(moment(event.end).format('YYYY-MM-DD'));
      setBlockReason(event.title === 'Blocked' ? '' : event.title);
      setBlockFormError('');
      setIsEditingBlock(true);
      setEditingBlockId(event.id);
      setBlockModalVisible(true);
    }
  };

  // Date navigation & view change
  const onViewChange = ({ viewType, showAgenda, isEventPerspective }) => {
    schedulerData.setViewType(viewType, showAgenda, isEventPerspective);
    setSchedulerData(schedulerData);
    setCurrentView(viewType);
  };
  const onSelectDate = (date) => {
    schedulerData.setDate(date);
    setSchedulerData(schedulerData);
    loadData();
  };
  const onPrev = () => {
    schedulerData.prev();
    setSchedulerData(schedulerData);
    loadData();
  };
  const onNext = () => {
    schedulerData.next();
    setSchedulerData(schedulerData);
    loadData();
  };

  // Mobile drag selection
  const handleTouchEnd = (e) => {
    const el = document.elementFromPoint(
      e.changedTouches[0].clientX,
      e.changedTouches[0].clientY
    );
    if (el && !el.classList.contains('week-event-block')) {
      const slotId = el.getAttribute('data-resource-id');
      const start = el.getAttribute('data-start');
      const end = el.getAttribute('data-end');
      if (slotId && start && end) {
        onSelectSlot(schedulerData, slotId, null, start, end);
      }
    }
  };

  // Create or update booking
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingFormError('');
    if (!selectedRoom) return setBookingFormError('Please select a room.');
    if (!selectedGuest) return setBookingFormError('Please select a guest.');
    const startISO = `${bookingStart}T12:00:00`;
    const endISO = `${bookingEnd}T12:00:00`;
    if (new Date(startISO) >= new Date(endISO)) {
      return setBookingFormError('Check-out must be after check-in.');
    }
    try {
      if (isEditingBooking && editingBookingId) {
        await fetchJSON(`/api/bookings/${editingBookingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            room: selectedRoom,
            guest: selectedGuest,
            startDate: startISO,
            endDate: endISO,
            status: bookingStatus,
          }),
        });
        toast.success('Booking updated');
      } else {
        await fetchJSON('/api/bookings', {
          method: 'POST',
          body: JSON.stringify({
            room: selectedRoom,
            guest: selectedGuest,
            startDate: startISO,
            endDate: endISO,
            status: bookingStatus,
          }),
        });
        toast.success('Booking created');
      }
      setBookingModalVisible(false);
      loadData();
    } catch (err) {
      console.error('Booking failed:', err);
      setBookingFormError(err.message);
    }
  };

  // Cancel booking (modal)
  const handleCancelBooking = () => {
    if (!editingBookingId) return;
    showConfirm(
      'Cancel this booking?',
      async () => {
        try {
          await fetchJSON(`/api/bookings/${editingBookingId}`, { method: 'DELETE' });
          setBookingModalVisible(false);
          loadData();
          toast.success('Booking cancelled');
        } catch (err) {
          console.error('Cancel booking failed:', err);
          toast.error('Failed to cancel booking');
        }
      },
      'Confirm Cancellation'
    );
  };

  // Close booking modal & reset
  const closeBookingModal = () => {
    setBookingModalVisible(false);
    setIsEditingBooking(false);
    setEditingBookingId(null);
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
    setBookingFormError('');
  };

  // Create or update block
  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    setBlockFormError('');
    if (!blockRoom) return setBlockFormError('Please select a room.');
    const startISO = `${blockStart}T00:00:00`;
    const endISO = `${blockEnd}T23:59:59`;
    if (new Date(startISO) >= new Date(endISO)) {
      return setBlockFormError('Block end must be after block start.');
    }
    try {
      if (isEditingBlock && editingBlockId) {
        await fetchJSON(`/api/blocks/${editingBlockId}`, { method: 'DELETE' });
        await fetchJSON('/api/blocks', {
          method: 'POST',
          body: JSON.stringify({
            room: blockRoom,
            startDate: startISO,
            endDate: endISO,
            reason: blockReason,
          }),
        });
        toast.success('Block updated');
      } else {
        await fetchJSON('/api/blocks', {
          method: 'POST',
          body: JSON.stringify({
            room: blockRoom,
            startDate: startISO,
            endDate: endISO,
            reason: blockReason,
          }),
        });
        toast.success('Room blocked');
      }
      setBlockModalVisible(false);
      loadData();
    } catch (err) {
      console.error('Block failed:', err);
      setBlockFormError(err.message);
    }
  };

  // Unblock (modal)
  const handleUnblock = () => {
    if (!editingBlockId) return;
    showConfirm(
      'Unblock this room?',
      async () => {
        try {
          await fetchJSON(`/api/blocks/${editingBlockId}`, { method: 'DELETE' });
          setBlockModalVisible(false);
          loadData();
          toast.success('Room unblocked');
        } catch (err) {
          console.error('Unblock failed:', err);
          toast.error('Failed to unblock room');
        }
      },
      'Confirm Unblock'
    );
  };

  // Close block modal & reset
  const closeBlockModal = () => {
    setBlockModalVisible(false);
    setIsEditingBlock(false);
    setEditingBlockId(null);
    setBlockReason('');
    setBlockFormError('');
  };

  return (
    <div className="p-4">
      <ToastContainer />
      {/* Toolbar */}
      <div className="flex items-center space-x-4 mb-4">
        <select
          value={selectedHotel || ''}
          onChange={(e) => setSelectedHotel(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <select
          value={selectedRoomType}
          onChange={(e) => setSelectedRoomType(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="all">All Types</option>
          {roomTypes.map((rt) => (
            <option key={rt} value={rt}>
              {rt}
            </option>
          ))}
        </select>
        <select
          value={currentView}
          onChange={(e) =>
            onViewChange({
              viewType: parseInt(e.target.value, 10),
              showAgenda: false,
              isEventPerspective: 0,
            })
          }
          className="border px-2 py-1 rounded"
        >
          <option value={ViewTypes.Month}>Month</option>
          <option value={ViewTypes.Week}>Week</option>
          <option value={ViewTypes.Day}>Day</option>
        </select>
        <button onClick={onPrev} className="px-2 py-1 border rounded">
          Prev
        </button>
        <button onClick={onNext} className="px-2 py-1 border rounded">
          Next
        </button>
        <div className="flex items-center ml-4">
          <input
            type="checkbox"
            id="modeToggle"
            checked={isBlockMode}
            onChange={(e) => setIsBlockMode(e.target.checked)}
          />
          <label htmlFor="modeToggle" className="ml-1 font-semibold">
            Block Mode
          </label>
        </div>
      </div>

      {/* Scheduler */}
      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
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
            newEvent={onSelectSlot}
            updateEventStart={onEventResize}
            updateEventEnd={onEventResize}
            eventItemTemplateResolver={eventItemTemplateResolver}
            eventItemPopoverTemplateResolver={eventItemPopoverTemplateResolver}
          />
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 p-2 bg-white border rounded shadow text-sm">
        <strong>Legend:</strong>
        <div className="flex space-x-4 mt-1">
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-yellow-500 inline-block rounded" /> Tentative
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-blue-500 inline-block rounded" /> Booked
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-green-500 inline-block rounded" /> Checked In
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-red-500 inline-block rounded" /> Checked Out
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-gray-600 inline-block rounded" /> Cancelled / Block
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {bookingModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-semibold mb-4">
              {isEditingBooking ? 'Edit Booking' : 'New Booking'}
            </h2>
            {bookingFormError && <div className="text-red-600 mb-2">{bookingFormError}</div>}
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
                      {`Room ${r.number}`}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={guestInputRef} className="relative">
                <label className="block font-medium mb-1">Guest:</label>
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
                />
                {showGuestSuggestions && (
                  <div className="absolute left-0 right-0 bg-white border max-h-40 overflow-auto z-10">
                    {filteredGuests.map((g) => (
                      <div
                        key={g.id}
                        className="p-2 hover:bg-gray-100 flex justify-between items-center cursor-pointer"
                        onClick={() => {
                          setGuestSearch(g.name);
                          setSelectedGuest(g.id);
                          setShowGuestSuggestions(false);
                        }}
                      >
                        <span>{g.name}</span>
                        <button
                          type="button"
                          className="text-blue-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            openGuestEdit(g);
                          }}
                        >
                          ✎
                        </button>
                      </div>
                    ))}
                    <div className="p-2 border-t">
                      {newGuestMode ? (
                        <>
                          {newGuestError && <div className="text-red-600 mb-1">{newGuestError}</div>}
                          <input
                            type="text"
                            className="w-full border px-2 py-1 rounded mb-1"
                            placeholder="Name"
                            value={newGuestName}
                            onChange={(e) => setNewGuestName(e.target.value)}
                          />
                          <input
                            type="email"
                            className="w-full border px-2 py-1 rounded mb-1"
                            placeholder="Email"
                            value={newGuestEmail}
                            onChange={(e) => setNewGuestEmail(e.target.value)}
                          />
                          <input
                            type="text"
                            className="w-full border px-2 py-1 rounded mb-1"
                            placeholder="Phone"
                            value={newGuestPhone}
                            onChange={(e) => setNewGuestPhone(e.target.value)}
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setNewGuestMode(false)}
                              className="px-4 py-2 rounded border"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleAddNewGuest}
                              className="px-4 py-2 rounded bg-blue-600 text-white"
                            >
                              Add
                            </button>
                          </div>
                        </>
                      ) : editingGuestMode ? (
                        <>
                          {editingGuestError && (
                            <div className="text-red-600 mb-1">{editingGuestError}</div>
                          )}
                          <input
                            type="text"
                            className="w-full border px-2 py-1 rounded mb-1"
                            value={editingGuestName}
                            onChange={(e) => setEditingGuestName(e.target.value)}
                          />
                          <input
                            type="email"
                            className="w-full border px-2 py-1 rounded mb-1"
                            value={editingGuestEmail}
                            onChange={(e) => setEditingGuestEmail(e.target.value)}
                          />
                          <input
                            type="text"
                            className="w-full border px-2 py-1 rounded mb-1"
                            value={editingGuestPhone}
                            onChange={(e) => setEditingGuestPhone(e.target.value)}
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setEditingGuestMode(false)}
                              className="px-4 py-2 rounded border"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleGuestUpdate}
                              className="px-4 py-2 rounded bg-blue-600 text-white"
                            >
                              Update
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left text-blue-600"
                          onClick={() => setNewGuestMode(true)}
                        >
                          + Add new guest
                        </button>
                      )}
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

              <div>
                <label className="block font-medium">Status:</label>
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={bookingStatus}
                  onChange={(e) => setBookingStatus(e.target.value)}
                >
                  <option value="tentative">Tentative</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checkedin">Checked In</option>
                  <option value="checkedout">Checked Out</option>
                </select>
              </div>

              <div className="flex justify-between">
                {isEditingBooking && (
                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    className="px-4 py-2 rounded bg-red-600 text-white"
                  >
                    Cancel Booking
                  </button>
                )}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={closeBookingModal}
                    className="px-4 py-2 rounded border"
                  >
                    Close
                  </button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">
                    {isEditingBooking ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {blockModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-80">
            <h2 className="text-xl font-semibold mb-4">
              {isEditingBlock ? 'Edit Block' : 'New Block'}
            </h2>
            {blockFormError && <div className="text-red-600 mb-2">{blockFormError}</div>}
            <form onSubmit={handleBlockSubmit} className="space-y-4">
              <div>
                <label className="block font-medium">Room:</label>
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={blockRoom}
                  onChange={(e) => setBlockRoom(e.target.value)}
                >
                  <option value="">— Select Room —</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {`Room ${r.number}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium">Start:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-medium">End:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-medium">Reason:</label>
                <input
                  type="text"
                  className="w-full border px-2 py-1 rounded"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>

              <div className="flex justify-between">
                {isEditingBlock && (
                  <button
                    type="button"
                    onClick={handleUnblock}
                    className="px-4 py-2 rounded bg-red-600 text-white"
                  >
                    Unblock
                  </button>
                )}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={closeBlockModal}
                    className="px-4 py-2 rounded border"
                  >
                    Close
                  </button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">
                    {isEditingBlock ? 'Update' : 'Block'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={confirmModalVisible}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={handleConfirmYes}
        onCancel={handleConfirmNo}
      />
    </div>
  );
}

export default DragDropContext(HTML5Backend)(CalendarScheduler);
