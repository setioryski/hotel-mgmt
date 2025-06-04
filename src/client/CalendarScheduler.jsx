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

// Helper: fetch + parse JSON
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

function CalendarSchedulerBase() {
  //
  // 1) Initialize SchedulerData with built-in header disabled
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
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState(null);

  // Booking form fields
  const [selectedRoom, setSelectedRoom] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [bookingStatus, setBookingStatus] = useState('tentative');
  const [bookingFormError, setBookingFormError] = useState('');

  // Block modal state (unchanged)
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [isEditingBlock, setIsEditingBlock] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);

  // Block form fields (unchanged)
  const [blockRoom, setBlockRoom] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockFormError, setBlockFormError] = useState('');

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Toggle between booking vs. block mode
  const [isBlockMode, setIsBlockMode] = useState(false);

  // Track current view type (Month / Week / Day)
  const [currentView, setCurrentView] = useState(ViewTypes.Month);

  const guestInputRef = useRef();
  const schedulerWrapperRef = useRef(null);

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
  // 4) Fetch rooms, bookings, and blocks whenever selectedHotel or roomType changes
  //
  const loadData = () => {
    if (!selectedHotel) return;
    setIsLoading(true);

    Promise.all([
      fetchJSON(`/api/rooms?hotel=${selectedHotel}`),
      fetchJSON(`/api/bookings?hotel=${selectedHotel}`),
      fetchJSON(`/api/blocks?hotel=${selectedHotel}`),
    ])
      .then(([roomsResponse, bookingsResponse, blocksResponse]) => {
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

        // Map to scheduler resources, making name clickable to toggle block-all
        const resourceList = filteredRoomsData.map((r) => ({
          id: r.id,
          name: (
            <span
              onClick={(e) => {
                e.stopPropagation();
                toggleBlockAll(r.id);
              }}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              {`Room ${r.number} (${r.type})`}
            </span>
          ),
        }));

        // Normalize bookings
        const bookings = Array.isArray(bookingsResponse)
          ? bookingsResponse
          : Array.isArray(bookingsResponse.data)
          ? bookingsResponse.data
          : [];

        // Map bookings to scheduler events (with color by status)
        const bookingEvents = bookings
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

            // Determine color by b.status
            let bgColor = '#3B82F6'; // blue for 'booked'
            if (b.status === 'tentative') bgColor = '#FBBF24'; // yellow
            else if (b.status === 'checkedin') bgColor = '#10B981'; // green
            else if (b.status === 'checkedout') bgColor = '#EF4444'; // red

            const startMoment = moment(startDateStr);
            const endMoment = moment(endDateStr);
            const nights = endMoment.diff(startMoment, 'days');

            return {
              id: id,
              resourceId: roomId,
              title: title,
              start: startMoment.format(DATE_FORMAT),
              end: endMoment.format(DATE_FORMAT),
              bgColor,
              guestEmail: guestObj.email || '',
              guestPhone: guestObj.phone || '',
              notes: b.notes || '',
              nights: nights,
              guestId: guestObj.id || null,
              status: b.status,
              type: 'booking', // mark as booking
            };
          })
          .filter(Boolean);

        // Normalize blocks (unchanged)
        const blocks = Array.isArray(blocksResponse)
          ? blocksResponse
          : Array.isArray(blocksResponse.data)
          ? blocksResponse.data
          : [];

        const blockEvents = blocks.map((b) => {
          const startMoment = moment(b.start);
          const endMoment = moment(b.end);
          return {
            id: b.id,
            resourceId: b.resourceId,
            title: b.title || 'Blocked',
            start: startMoment.format(DATE_FORMAT),
            end: endMoment.format(DATE_FORMAT),
            bgColor: '#999999', // gray for blocks
            type: 'block', // mark as block
          };
        });

        // Combine both bookings and blocks
        const eventList = [...bookingEvents, ...blockEvents];

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
  // 6) OPEN BOOKING OR BLOCK MODAL when clicking an empty cell:
  //
  const onSelectSlot = (schedulerData, slotId, slotName, start, end) => {
    const startDate = moment(start).format('YYYY-MM-DD');
    const endDate = moment(end).format('YYYY-MM-DD');
    if (isBlockMode) {
      // BLOCK mode: open block modal (unchanged)
      setBlockRoom(slotId);
      setBlockStart(startDate);
      setBlockEnd(endDate);
      setBlockReason('');
      setBlockFormError('');
      setIsEditingBlock(false);
      setEditingBlockId(null);
      setBlockModalVisible(true);
    } else {
      // BOOKING mode: open booking modal
      setSelectedRoom(slotId);
      setBookingStart(startDate);
      setBookingEnd(endDate);
      setSelectedGuest('');
      setGuestSearch('');
      setBookingStatus('tentative');
      setBookingFormError('');
      setIsEditingBooking(false);
      setEditingBookingId(null);
      setNewGuestMode(false);
      setEditingGuestMode(false);
      setBookingModalVisible(true);
    }
  };

  //
  // 7) SUBMIT NEW OR UPDATE BOOKING:
  //
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingFormError('');
    if (!selectedRoom) return setBookingFormError('Please select a room.');
    if (!selectedGuest) return setBookingFormError('Please select a guest.');

    const startDateTime = `${bookingStart}T12:00:00`;
    const endDateTime = `${bookingEnd}T12:00:00`;
    if (new Date(startDateTime) >= new Date(endDateTime)) {
      return setBookingFormError('Check-out must be after check-in.');
    }

    try {
      if (isEditingBooking && editingBookingId) {
        // UPDATE existing booking
        await fetchJSON(`/api/bookings/${editingBookingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            room: selectedRoom,
            guest: selectedGuest,
            startDate: startDateTime,
            endDate: endDateTime,
            status: bookingStatus,
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
            status: bookingStatus,
          }),
        });
      }

      setBookingModalVisible(false);
      setIsEditingBooking(false);
      setEditingBookingId(null);
      setNewGuestMode(false);
      setEditingGuestMode(false);
      loadData();
    } catch (err) {
      console.error('Booking operation failed:', err);
      setBookingFormError(err.message);
    }
  };

  //
  // 8) CANCEL (DELETE) BOOKING from within modal:
  //
  const handleCancelBooking = async () => {
    if (!editingBookingId) return;
    if (!window.confirm('Are you sure you want to cancel this booking?'))
      return;
    try {
      await fetchJSON(`/api/bookings/${editingBookingId}`, { method: 'DELETE' });
      setBookingModalVisible(false);
      setIsEditingBooking(false);
      setEditingBookingId(null);
      setNewGuestMode(false);
      setEditingGuestMode(false);
      loadData();
    } catch (err) {
      console.error('Cancel booking failed:', err);
    }
  };

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

  //
  // 9) SUBMIT NEW OR UPDATE BLOCK: (unchanged)
  //
  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    setBlockFormError('');
    if (!blockRoom) return setBlockFormError('Please select a room.');
    const startDateTime = `${blockStart}T00:00:00`;
    const endDateTime = `${blockEnd}T23:59:59`;
    if (new Date(startDateTime) >= new Date(endDateTime)) {
      return setBlockFormError('Block end must be after block start.');
    }

    try {
      if (isEditingBlock && editingBlockId) {
        // For simplicity, delete and recreate
        await fetchJSON(`/api/blocks/${editingBlockId}`, { method: 'DELETE' });
        await fetchJSON('/api/blocks', {
          method: 'POST',
          body: JSON.stringify({
            room: blockRoom,
            startDate: startDateTime,
            endDate: endDateTime,
            reason: blockReason,
          }),
        });
      } else {
        // CREATE new block
        await fetchJSON('/api/blocks', {
          method: 'POST',
          body: JSON.stringify({
            room: blockRoom,
            startDate: startDateTime,
            endDate: endDateTime,
            reason: blockReason,
          }),
        });
      }

      setBlockModalVisible(false);
      setIsEditingBlock(false);
      setEditingBlockId(null);
      setBlockReason('');
      loadData();
    } catch (err) {
      console.error('Block operation failed:', err);
      setBlockFormError(err.message);
    }
  };

  //
  // 10) UNBLOCK (DELETE) BLOCK from within modal: (unchanged)
  //
  const handleUnblock = async () => {
    if (!editingBlockId) return;
    if (!window.confirm('Are you sure you want to unblock this room?'))
      return;
    try {
      await fetchJSON(`/api/blocks/${editingBlockId}`, { method: 'DELETE' });
      setBlockModalVisible(false);
      setIsEditingBlock(false);
      setEditingBlockId(null);
      setBlockReason('');
      loadData();
    } catch (err) {
      console.error('Unblock failed:', err);
    }
  };

  const closeBlockModal = () => {
    setBlockModalVisible(false);
    setIsEditingBlock(false);
    setEditingBlockId(null);
    setBlockReason('');
    setBlockFormError('');
  };

  //
  // 11) UPDATE BOOKING when dragging/resizing:
  //
  const updateBooking = (id, body) =>
    fetchJSON(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
      .then(loadData)
      .catch((err) => console.error('Booking update failed:', err));

  const onEventMove = (ev, slotId, start, end) => {
    if (ev.type === 'booking') {
      const startISO = moment(start).format();
      const endISO = moment(end).format();
      updateBooking(ev.id, {
        room: slotId,
        startDate: startISO,
        endDate: endISO,
        status: ev.status,
      });
    }
    // Blocks are not draggable/resizable for now
  };
  const onEventResize = (ev, slotId, start, end) => {
    if (ev.type === 'booking') {
      const startISO = moment(start).format();
      const endISO = moment(end).format();
      updateBooking(ev.id, {
        startDate: startISO,
        endDate: endISO,
        status: ev.status,
      });
    }
  };

  //
  // 12) DOUBLE-CLICK on an existing event to open “Edit” modal:
  //
  const onEventDoubleClick = (schedulerData, event) => {
    if (event.type === 'booking') {
      // Edit booking
      const start = moment(event.start).format('YYYY-MM-DD');
      const end = moment(event.end).format('YYYY-MM-DD');
      setSelectedRoom(event.resourceId);
      setBookingStart(start);
      setBookingEnd(end);
      setSelectedGuest(event.guestId);
      setGuestSearch(event.title);
      setBookingFormError('');
      setBookingStatus(event.status);
      setIsEditingBooking(true);
      setEditingBookingId(event.id);
      setNewGuestMode(false);
      setEditingGuestMode(false);
      setBlockModalVisible(false);
      setIsEditingBlock(false);
      setEditingBlockId(null);
      setBookingModalVisible(true);
    } else if (event.type === 'block') {
      // Edit block (unchanged)
      const start = moment(event.start).format('YYYY-MM-DD');
      const end = moment(event.end).format('YYYY-MM-DD');
      setBlockRoom(event.resourceId);
      setBlockStart(start);
      setBlockEnd(end);
      setBlockReason(event.title === 'Blocked' ? '' : event.title);
      setBlockFormError('');
      setIsEditingBlock(true);
      setEditingBlockId(event.id);
      setBookingModalVisible(false);
      setIsEditingBooking(false);
      setEditingBookingId(null);
      setBlockModalVisible(true);
    }
  };

  //
  // 13) VIEW & DATE CHANGE CALLBACKS (re-apply resources+events):
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
  // 14) PREV & NEXT navigation:
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
  // 15) RENDER EVENT ITEM (with a small ✎ icon for bookings)
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
        title={`${
          event.type === 'booking'
            ? `Guest: ${event.title}\nCheck-In: ${moment(event.start).format(
                'YYYY-MM-DD'
              )}\nCheck-Out: ${moment(event.end).format('YYYY-MM-DD')}\nStatus: ${
                event.status.charAt(0).toUpperCase() + event.status.slice(1)
              }`
            : `Block Reason: ${event.title}\nFrom: ${moment(event.start).format(
                'YYYY-MM-DD'
              )}\nTo: ${moment(event.end).format('YYYY-MM-DD')}`
        }`}
        style={{
          borderLeft: `${borderWidth}px solid ${bgColor}`,
          backgroundColor: bgColor,
          height: mustBeHeight,
          maxWidth: agendaMaxEventWidth,
          padding: '2px',
          position: 'relative',
          cursor: 'pointer',
          color: '#ffffff',
        }}
        onDoubleClick={() => onEventDoubleClick(schedulerData, event)}
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
              cursor: 'pointer',
            }}
          >
            ✎
          </span>
        )}
      </div>
    );
  };

  //
  // 16) CUSTOM POPOVER on hover/long-press (unchanged)
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
        {event.type === 'booking' ? (
          <>
            <div className="font-semibold mb-1">{event.title}</div>
            <div className="text-sm mb-1">
              <strong>Status:</strong>{' '}
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </div>
            <div className="text-sm mb-1">
              <strong>Email:</strong> {event.guestEmail}
            </div>
            <div className="text-sm mb-1">
              <strong>Phone:</strong> {event.guestPhone}
            </div>
            <div className="text-sm mb-1">
              <strong>Check-In:</strong>{' '}
              {moment(event.start).format('YYYY-MM-DD')}
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
            <div className="text-sm mb-1">
              <strong>To:</strong> {moment(event.end).format('YYYY-MM-DD')}
            </div>
          </>
        )}
      </div>
    );
  };

  //
  // 17) FILTER GUESTS FOR AUTOCOMPLETE
  //
  const filteredGuests = guests.filter((g) =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase())
  );

  //
  // 18) ADD NEW GUEST (unchanged)
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
  // 19) OPEN EDIT CURRENT GUEST (unchanged)
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
  // 20) SUBMIT GUEST UPDATE (unchanged)
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
  // 21) CATCH MOBILE TAPS on empty cell (unchanged)
  //
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
  // 22) TOGGLE BLOCK ALL DATES FOR A ROOM (unchanged)
  //
  const toggleBlockAll = async (roomId) => {
    const existing = events.find(
      (ev) => ev.resourceId === roomId && ev.title === 'All Dates'
    );
    try {
      if (existing) {
        await fetchJSON(`/api/blocks/${existing.id}`, {
          method: 'DELETE',
        });
      } else {
        await fetchJSON('/api/blocks', {
          method: 'POST',
          body: JSON.stringify({
            room: roomId,
            startDate: '1970-01-01T00:00:00',
            endDate: '2100-12-31T23:59:59',
            reason: 'All Dates',
          }),
        });
      }
      loadData();
    } catch (err) {
      console.error('Toggle block-all failed:', err);
    }
  };

  return (
    <div className="p-4 relative">
      <h1 className="text-2xl font-bold mb-4">Booking & Block Calendar</h1>

      {/* Toolbar: Hotel, Room Type, Prev/Next, View Toggle, Mode Toggle */}
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

        <div className="flex items-center space-x-1 ml-4">
          <input
            type="checkbox"
            id="modeToggle"
            checked={isBlockMode}
            onChange={(e) => setIsBlockMode(e.target.checked)}
          />
          <label htmlFor="modeToggle" className="font-semibold">
            Block Mode
          </label>
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
            newEvent={onSelectSlot}            // click (desktop) => new booking/block
            updateEventStart={onEventResize}
            updateEventEnd={onEventResize}
            eventItemTemplateResolver={eventItemTemplateResolver}
            eventItemPopoverTemplateResolver={
              eventItemPopoverTemplateResolver
            }
          />
        </div>
      )}

      {/* Legend (updated with all statuses) */}
      <div className="mt-4 p-2 bg-white border rounded shadow text-sm">
        <strong>Legend:</strong>
        <div className="flex space-x-4 mt-1">
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-yellow-500 inline-block rounded"></span>
            <span>Tentative</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-blue-500 inline-block rounded"></span>
            <span>Booked</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-green-500 inline-block rounded"></span>
            <span>Checked In</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-red-500 inline-block rounded"></span>
            <span>Checked Out</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-gray-600 inline-block rounded"></span>
            <span>Cancelled / Block</span>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {bookingModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96 relative">
            <h2 className="text-xl font-semibold mb-4">
              {isEditingBooking ? 'Edit Booking' : 'New Booking'}
            </h2>
            {bookingFormError && (
              <div className="text-red-600 mb-2">{bookingFormError}</div>
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
                      {typeof r.name === 'string' ? r.name : `Room ${r.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Guest selection / display */}
              <div ref={guestInputRef}>
                <label className="block font-medium mb-1">Guest:</label>

                {isEditingBooking ? (
                  // When editing, show the already‐chosen guest as a disabled input
                  <input
                    type="text"
                    className="w-full border px-2 py-1 rounded bg-gray-100 cursor-not-allowed"
                    value={guestSearch}
                    disabled
                  />
                ) : (
                  // When creating new booking, use autocomplete + add‐new logic
                  <>
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
                                setEditingGuestMode(false);
                              }}
                            >
                              + Add new guest
                            </li>
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
                  </>
                )}
              </div>

              {/* Status selection */}
              <div>
                <label className="block font-medium">Status:</label>
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={bookingStatus}
                  onChange={(e) => setBookingStatus(e.target.value)}
                >
                  {isEditingBooking ? (
                    // Editing: show options based on current bookingStatus
                    bookingStatus === 'tentative' ? (
                      <>
                        <option value="tentative">Tentative</option>
                        <option value="booked">Booked</option>
                      </>
                    ) : bookingStatus === 'booked' ? (
                      <>
                        <option value="booked">Booked</option>
                        <option value="checkedin">Checked In</option>
                      </>
                    ) : bookingStatus === 'checkedin' ? (
                      <>
                        <option value="checkedin">Checked In</option>
                        <option value="checkedout">Checked Out</option>
                      </>
                    ) : bookingStatus === 'checkedout' ? (
                      <option value="checkedout">Checked Out</option>
                    ) : (
                      // fallback
                      <>
                        <option value="tentative">Tentative</option>
                        <option value="booked">Booked</option>
                        <option value="checkedin">Checked In</option>
                        <option value="checkedout">Checked Out</option>
                      </>
                    )
                  ) : (
                    // New booking: only tentative or booked
                    <>
                      <option value="tentative">Tentative</option>
                      <option value="booked">Booked</option>
                    </>
                  )}
                </select>
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
                  onClick={closeBookingModal}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>
                {isEditingBooking && (
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
                    {isEditingBooking ? 'Update' : 'Book'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {blockModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96 relative">
            <h2 className="text-xl font-semibold mb-4">
              {isEditingBlock ? 'Edit Block' : 'New Block'}
            </h2>
            {blockFormError && (
              <div className="text-red-600 mb-2">{blockFormError}</div>
            )}
            <form onSubmit={handleBlockSubmit} className="space-y-4">
              {/* Room selection */}
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
                      {typeof r.name === 'string' ? r.name : `Room ${r.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Block reason */}
              <div>
                <label className="block font-medium">Reason (optional):</label>
                <input
                  type="text"
                  className="w-full border px-2 py-1 rounded"
                  placeholder="e.g. Maintenance"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>

              {/* Block start */}
              <div>
                <label className="block font-medium">Block Start:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                />
              </div>

              {/* Block end */}
              <div>
                <label className="block font-medium">Block End:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                />
              </div>

              {/* Block modal buttons */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={closeBlockModal}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>
                {isEditingBlock && (
                  <button
                    type="button"
                    onClick={handleUnblock}
                    className="bg-red-600 text-white px-4 py-2 rounded"
                  >
                    Unblock Room
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-gray-800 text-white px-4 py-2 rounded"
                >
                  {isEditingBlock ? 'Update Block' : 'Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DragDropContext(HTML5Backend)(CalendarSchedulerBase);
