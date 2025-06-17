// src/client/CalendarScheduler.jsx

// ──────────────────────────────────────────────────────────────
// Imports & Third-Party Setup
// ──────────────────────────────────────────────────────────────
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

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Prevent mobile text selection & allow taps
const CELL_CSS_OVERRIDES = {
  touchAction: 'manipulation',
  userSelect: 'none',
};

// ──────────────────────────────────────────────────────────────
// ConfirmModal: reusable confirmation dialog for critical actions
// ──────────────────────────────────────────────────────────────
const ConfirmModal = ({ visible, title, message, onConfirm, onCancel }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-11/12 md:w-80">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <p className="mb-4">{message}</p>
        <div className="flex justify-end space-x-2">
          <button onClick={onCancel} className="px-4 py-2 rounded border">
            No
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-red-600 text-white"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// CalendarScheduler: main booking/block calendar component
// ──────────────────────────────────────────────────────────────
function CalendarScheduler({ initialHotelId }) {
  const isMobile = window.innerWidth < 768;
  const [blockedRoomsAll, setBlockedRoomsAll] = useState([]);
  // ────────────────────────────────────────────────────────────
  // SchedulerData initialization
  // ────────────────────────────────────────────────────────────
  const [schedulerData, setSchedulerData] = useState(() => {
    const sd = new SchedulerData(
      moment().format(DATE_FORMAT),
      ViewTypes.Month,
      false,
      false,
      {
        minuteStep: 30,
        headerEnabled: false,
        eventItemPopoverEnabled: false,
      }
    );
    return sd;
  });

  // ────────────────────────────────────────────────────────────
  // Core state hooks
  // ────────────────────────────────────────────────────────────
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoomType, setSelectedRoomType] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isBlockMode, setIsBlockMode] = useState(false);
  const [currentView, setCurrentView] = useState(ViewTypes.Month);

  // ────────────────────────────────────────────────────────────
  // Mobile-specific booking flow state
  // ────────────────────────────────────────────────────────────
  const [mobileBookingRoom, setMobileBookingRoom] = useState(null);
  const [mobileCheckin, setMobileCheckin] = useState('');
  const [mobileCheckout, setMobileCheckout] = useState('');

  // ────────────────────────────────────────────────────────────
  // Guest autocomplete & inline add/edit state
  // ────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────
  // Booking modal & form state
  // ────────────────────────────────────────────────────────────
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [bookingStatus, setBookingStatus] = useState('tentative');
  const [bookingFormError, setBookingFormError] = useState('');
  const [bookingPrice, setBookingPrice] = useState('');
  const [roomPrices, setRoomPrices] = useState({});
  const [bookingTotal, setBookingTotal] = useState('');

  // ────────────────────────────────────────────────────────────
  // Block modal & form state
  // ────────────────────────────────────────────────────────────
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [isEditingBlock, setIsEditingBlock] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [blockRoom, setBlockRoom] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockFormError, setBlockFormError] = useState('');

  // ────────────────────────────────────────────────────────────
  // Confirm modal state
  // ────────────────────────────────────────────────────────────
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmCallback, setConfirmCallback] = useState(() => {});

  // ────────────────────────────────────────────────────────────
  // Refs
  // ────────────────────────────────────────────────────────────
  const guestInputRef = useRef();
  const schedulerWrapperRef = useRef(null);

  // ────────────────────────────────────────────────────────────
  // Helper: fetch JSON with error handling
  // ────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────
  // Confirm modal controls
  // ────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────
  // Initial data fetch: hotels & guests
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchJSON('/api/hotels')
      .then((data) => {
        setHotels(data);
        const pick = data.find((h) => h.id === initialHotelId)
          ? initialHotelId
          : data.length && data[0].id;
        setSelectedHotel(pick);
      })
      .catch((err) => console.error('Load hotels failed:', err));
  }, []);
  useEffect(() => {
    fetchJSON('/api/guests')
      .then(setGuests)
      .catch((err) => console.error('Load guests failed:', err));
  }, []);

  // ────────────────────────────────────────────────────────────
  // Load & normalize rooms, bookings, blocks into scheduler
  // ────────────────────────────────────────────────────────────
  const loadData = () => {
    if (!selectedHotel) return;
    setIsLoading(true);
    Promise.all([
      fetchJSON(`/api/rooms?hotel=${selectedHotel}`),
      fetchJSON(`/api/bookings?hotel=${selectedHotel}`),
      fetchJSON(`/api/blocks?hotel=${selectedHotel}`),
    ])
      .then(([roomsResp, bookingsResp, blocksResp]) => {
        const rooms = Array.isArray(roomsResp) ? roomsResp : roomsResp.data || [];
        setRoomTypes([...new Set(rooms.map((r) => r.type))].sort());

        const prices = {};
        rooms.forEach((r) => {
          prices[r.id] = r.price;
        });
        setRoomPrices(prices);

        const filteredRooms = rooms.filter(
          (r) => selectedRoomType === 'all' || r.type === selectedRoomType
        );
        const resourceList = filteredRooms.map((r) => {
          const isBlocked = blockedRoomsAll.includes(r.id);
          const handleResourceClick = (e) => {
            e.stopPropagation();
            if (isMobile) {
              handleMobileRoomSelect(r);
            } else {
              toggleBlockAll(r.id);
            }
          };

          return {
            id: r.id,
            number: r.number,
            type: r.type,
            name: (
              <div
                onClick={handleResourceClick}
                title={isMobile ? 'Tap to book this room' : 'Tap to block/unblock all dates'}
                style={{
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  padding: '4px 8px',
                  backgroundColor: isBlocked ? 'rgba(255, 0, 0, 0.2)' : undefined,
                  color: isBlocked ? 'red' : undefined,
                }}
              >
                {`Room ${r.number} (${r.type})`}
              </div>
            ),
          };
        });

        const bookingEvents = (
          Array.isArray(bookingsResp) ? bookingsResp : bookingsResp.data || []
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
            price: e.price,
            bgColor,
            status: e.status,
            guestId: e.guestId,
            type: 'booking',
          };
        });

        const blockEvents = (
          Array.isArray(blocksResp) ? blocksResp : blocksResp.data || []
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
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Load data failed:', err);
        setIsLoading(false);
      });
  };
  useEffect(loadData, [selectedHotel, selectedRoomType]);

  // ────────────────────────────────────────────────────────────
  // UI Effect Handlers
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (guestInputRef.current && !guestInputRef.current.contains(e.target)) {
        setShowGuestSuggestions(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const wrapper = schedulerWrapperRef.current;
    if (!wrapper) return;
    const tables = wrapper.querySelectorAll('table.resource-table');
    if (tables.length === 0) return;
    const resourceTable = tables[tables.length - 1];
    const rows = Array.from(resourceTable.querySelectorAll('tbody tr'));
    rows.forEach((tr, idx) => {
      const cell = tr.querySelector('td');
      const roomId = resources[idx]?.id;
      if (cell) {
        if (blockedRoomsAll.includes(roomId)) {
          cell.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
          cell.style.color = 'red';
        } else {
          cell.style.backgroundColor = '';
          cell.style.color = '';
        }
      }
    });
  }, [resources, blockedRoomsAll]);

  useEffect(() => {
    const nights =
      bookingStart && bookingEnd
        ? moment(bookingEnd).diff(moment(bookingStart), 'days')
        : 0;
    const perNight = parseFloat(bookingPrice) || 0;
    setBookingTotal((perNight * nights).toFixed(2));
  }, [bookingPrice, bookingStart, bookingEnd]);

  // ────────────────────────────────────────────────────────────
  // Mobile Booking Flow Handlers
  // ────────────────────────────────────────────────────────────
  const handleMobileRoomSelect = (room) => {
    setMobileBookingRoom(room);
    setMobileCheckin('');
    setMobileCheckout('');
  };

  const handleMobileBookingSubmit = () => {
    if (!mobileBookingRoom || !mobileCheckin || !mobileCheckout) {
      return toast.error('Please select check-in and check-out dates.');
    }
    if (moment(mobileCheckin).isSameOrAfter(moment(mobileCheckout))) {
      return toast.error('Check-out date must be after check-in date.');
    }
    onSelectSlot(
      schedulerData,
      mobileBookingRoom.id,
      null,
      `${mobileCheckin} 00:00:00`,
      `${mobileCheckout} 00:00:00`
    );
  };

  // ────────────────────────────────────────────────────────────
  // Slot selection (Desktop) & Modal Trigger
  // ────────────────────────────────────────────────────────────
  const onSelectSlot = (schedulerData, slotId, slotName, start, end) => {
    if (blockedRoomsAll.includes(slotId)) {
      toast.error('This room is fully blocked.');
      return;
    }
    const startDate = moment(start).format('YYYY-MM-DD');
    const endDate = moment(end).format('YYYY-MM-DD');

    if (isBlockMode) {
      const bookingOverlap = events.find(
        (ev) =>
          ev.type === 'booking' &&
          ev.resourceId === slotId &&
          moment(start).isBefore(moment(ev.end)) &&
          moment(end).isAfter(moment(ev.start))
      );
      if (bookingOverlap) {
        toast.error(`Cannot block: room already booked.`);
        return;
      }
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
          (ev.type === 'block' || ev.type === 'booking') &&
          ev.resourceId === slotId &&
          moment(start).isBefore(moment(ev.end)) &&
          moment(end).isAfter(moment(ev.start))
      );
      if (overlap) {
        toast.error(`Cannot book: room is already occupied or blocked.`);
        return;
      }
      setSelectedRoom(slotId);
      setBookingStart(startDate);
      setBookingEnd(endDate);
      setBookingPrice(roomPrices[slotId] || '');
      setSelectedGuest('');
      setGuestSearch('');
      setBookingStatus('tentative');
      setBookingFormError('');
      setIsEditingBooking(false);
      setEditingBookingId(null);
      setNewGuestMode(false);
      setEditingGuestMode(false);
      setBookingModalVisible(true);
      setMobileBookingRoom(null);

      setTimeout(() => {
        const input = guestInputRef.current?.querySelector('input');
        if (input) {
          input.focus();
          setShowGuestSuggestions(true);
        }
      }, 0);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Booking handlers: create/update, cancel, close modal
  // ────────────────────────────────────────────────────────────
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
            price: bookingPrice,
            totalPrice: bookingTotal,
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
            price: bookingPrice,
            totalPrice: bookingTotal,
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

  const handleCancelBooking = async () => {
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

  // ────────────────────────────────────────────────────────────
  // Block handlers: create/update, unblock, close modal
  // ────────────────────────────────────────────────────────────
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
        await fetchJSON(`/api/blocks/${editingBlockId}`, {
          method: 'PUT',
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

  const handleUnblock = async () => {
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

  const closeBlockModal = () => {
    setBlockModalVisible(false);
    setIsEditingBlock(false);
    setEditingBlockId(null);
    setBlockReason('');
    setBlockFormError('');
  };

  // ────────────────────────────────────────────────────────────
  // Scheduler Event Handlers (Drag, Resize, Double-click)
  // ────────────────────────────────────────────────────────────
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

  const eventItemTemplateResolver = (sd, event, start, end, status, style) => {
    let bgColor = event.bgColor;
    const borderWidth = status === 'start' ? 4 : 1;
    const mustBeHeight = status === 'start' ? 28 : 22;
    return (
      <div
        key={event.id}
        title={
          event.type === 'booking'
            ? `Guest: ${event.title}\nCheck-In: ${moment(event.start).format(
                'YYYY-MM-DD'
              )}\nCheck-Out: ${moment(event.end).format(
                'YYYY-MM-DD'
              )}\nStatus: ${event.status}`
            : `Block: ${event.title}\nFrom: ${moment(event.start).format(
                'YYYY-MM-DD'
              )}\nTo: ${moment(event.end).format('YYYY-MM-DD')}`
        }
        style={{
          borderLeft: `${borderWidth}px solid ${bgColor}`,
          backgroundColor: bgColor,
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
          <span style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }}>
            ✎
          </span>
        )}
      </div>
    );
  };

  const toggleBlockAll = (roomId) => {
    setBlockedRoomsAll((curr) => {
      const isBlocked = curr.includes(roomId);
      const next = isBlocked ? curr.filter((id) => id !== roomId) : [...curr, roomId];
      toast.success(isBlocked ? 'Room unblocked for all dates' : 'Room blocked for all dates');
      return next;
    });
  };

  const onEventDoubleClick = (sd, event) => {
    if (event.type === 'booking') {
      setSelectedRoom(event.resourceId);
      setBookingStart(moment(event.start).format('YYYY-MM-DD'));
      setBookingEnd(moment(event.end).format('YYYY-MM-DD'));
      setBookingPrice(roomPrices[event.resourceId] || '');
      setBookingStatus(event.status);
      setBookingPrice(event.price ?? '');
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

  // ────────────────────────────────────────────────────────────
  // Date navigation & view change
  // ────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────
  // Guest autocomplete filtering & handlers
  // ────────────────────────────────────────────────────────────
  const filteredGuests = guests.filter((g) =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase())
  );

  const handleAddNewGuest = async () => {
    if (!newGuestName) return setNewGuestError('Name is required');
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

  const handleGuestUpdate = async () => {
    if (!editingGuestName) return setEditingGuestError('Name is required');
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
            ? { ...g, name: editingGuestName, email: editingGuestEmail, phone: editingGuestPhone }
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

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 relative pb-28 md:pb-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-2xl font-bold mb-4">{/* Header here */}</h1>

      <div className="flex flex-wrap items-center mb-4 gap-4">
        <div>
          <label className="mr-2 font-semibold">Room Type:</label>
          <select
            className="border px-2 py-1 rounded"
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value)}
          >
            <option value="all">All</option>
            {roomTypes.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex space-x-2">
          <button onClick={onPrev} className="bg-gray-200 hover:bg-gray-300 rounded w-10 h-8 flex items-center justify-center">
            ←
          </button>
          <button onClick={onNext} className="bg-gray-200 hover:bg-gray-300 rounded w-10 h-8 flex items-center justify-center">
            →
          </button>
        </div>
        <div>
          <select className="border px-2 py-1 rounded" value={currentView} onChange={(e) => onViewChange({ viewType: e.target.value, showAgenda: false, isEventPerspective: 0 })}>
            <option value={ViewTypes.Month}>Month</option>
            <option value={ViewTypes.Week}>Week</option>
            <option value={ViewTypes.Day}>Day</option>
          </select>
        </div>
        <div className="flex items-center">
          <input type="checkbox" id="modeToggle" checked={isBlockMode} onChange={(e) => setIsBlockMode(e.target.checked)} className="h-4 w-4" />
          <label htmlFor="modeToggle" className="ml-2 font-semibold">
            Block Mode
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div ref={schedulerWrapperRef} style={{ ...CELL_CSS_OVERRIDES, overflowX: 'auto' }}>
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
            eventItemPopoverEnabled={false}
          />
        </div>
      )}

      <div className="mt-4 p-2 bg-white border rounded shadow text-sm">
        <strong>Legend:</strong>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:space-x-4 mt-1">
          <div className="flex items-center space-x-1 mt-1 sm:mt-0">
            <span className="w-4 h-4 bg-yellow-500 inline-block rounded" />
            <span>Tentative</span>
          </div>
          <div className="flex items-center space-x-1 mt-1 sm:mt-0">
            <span className="w-4 h-4 bg-blue-500 inline-block rounded" />
            <span>Booked</span>
          </div>
          <div className="flex items-center space-x-1 mt-1 sm:mt-0">
            <span className="w-4 h-4 bg-green-500 inline-block rounded" />
            <span>Checked In</span>
          </div>
          <div className="flex items-center space-x-1 mt-1 sm:mt-0">
            <span className="w-4 h-4 bg-red-500 inline-block rounded" />
            <span>Checked Out</span>
          </div>
          <div className="flex items-center space-x-1 mt-1 sm:mt-0">
            <span className="w-4 h-4 bg-gray-600 inline-block rounded" />
            <span>Cancelled / Block</span>
          </div>
        </div>
      </div>

      {bookingModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 md:w-96 relative">
            <h2 className="text-xl font-semibold mb-4">{isEditingBooking ? 'Edit Booking' : 'New Booking'}</h2>
            {bookingFormError && <div className="text-red-600 mb-2">{bookingFormError}</div>}
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block font-medium">Room:</label>
                <select className="w-full border px-2 py-1 rounded" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
                  <option value="">— Select Room —</option>
                  {resources.map((r) => (<option key={r.id} value={r.id}>{`Room ${r.number}`}</option>))}
                </select>
              </div>
              <div ref={guestInputRef} className="relative">
                <label className="block font-medium mb-1">Guest:</label>
                <input type="text" className="w-full border px-2 py-1 rounded mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Search guest…" value={guestSearch} onChange={(e) => { setGuestSearch(e.target.value); setShowGuestSuggestions(true); setSelectedGuest(''); setEditingGuestMode(false); setNewGuestMode(false); }} onFocus={() => setShowGuestSuggestions(true)} />
                {showGuestSuggestions && (
                  <ul className="absolute left-0 z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto divide-y divide-gray-200">
                    <li className="px-3 py-2 hover:bg-gray-100 cursor-pointer font-semibold text-blue-600" onClick={() => { setNewGuestMode(true); setShowGuestSuggestions(false); }}>
                      + Add new guest
                    </li>
                    {filteredGuests.map((g) => (
                      <li key={g.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => { setSelectedGuest(g.id); setGuestSearch(g.name); setShowGuestSuggestions(false); }}>
                        {g.name} ({g.email || '—'})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {newGuestMode && (
                <div className="space-y-2">
                  <input type="text" className="w-full border px-2 py-1 rounded" placeholder="Name" value={newGuestName} onChange={(e) => setNewGuestName(e.target.value)} />
                  <input type="email" className="w-full border px-2 py-1 rounded" placeholder="Email" value={newGuestEmail} onChange={(e) => setNewGuestEmail(e.target.value)} />
                  <input type="tel" className="w-full border px-2 py-1 rounded" placeholder="Phone" value={newGuestPhone} onChange={(e) => setNewGuestPhone(e.target.value)} />
                  <button type="button" onClick={handleAddNewGuest} className="bg-green-600 text-white px-4 py-2 rounded">Save Guest</button>
                  {newGuestError && <div className="text-red-600">{newGuestError}</div>}
                </div>
              )}
              {editingGuestMode && (
                <div className="space-y-2">
                  <input type="text" className="w-full border px-2 py-1 rounded" value={editingGuestName} onChange={(e) => setEditingGuestName(e.target.value)} />
                  <input type="email" className="w-full border px-2 py-1 rounded" value={editingGuestEmail} onChange={(e) => setEditingGuestEmail(e.target.value)} />
                  <input type="tel" className="w-full border px-2 py-1 rounded" value={editingGuestPhone} onChange={(e) => setEditingGuestPhone(e.target.value)} />
                  <button type="button" onClick={handleGuestUpdate} className="bg-blue-600 text-white px-4 py-2 rounded">Update Guest</button>
                  {editingGuestError && <div className="text-red-600">{editingGuestError}</div>}
                </div>
              )}
              <div>
                <label className="block font-medium">Price</label>
                <input type="number" step="0.01" className="w-full border px-2 py-1 rounded" value={bookingPrice} onChange={(e) => setBookingPrice(e.target.value)} />
              </div>
              <div className="mt-2">
                <label className="block font-medium">Total Price</label>
                <input type="text" className="w-full border px-2 py-1 rounded bg-gray-100 cursor-not-allowed" value={bookingTotal} readOnly />
              </div>
              <div>
                <label className="block font-medium">Check-In</label>
                <input type="date" className="w-full border px-2 py-1 rounded" value={bookingStart} onChange={(e) => setBookingStart(e.target.value)} />
              </div>
              <div>
                <label className="block font-medium">Check-Out</label>
                <input type="date" className="w-full border px-2 py-1 rounded" value={bookingEnd} onChange={(e) => setBookingEnd(e.target.value)} />
              </div>
              {isEditingBooking && (
                <div>
                  <label className="block font-medium">Status</label>
                  <select className="w-full border px-2 py-1 rounded" value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}>
                    <option value="tentative">Tentative</option>
                    <option value="booked">Booked</option>
                    <option value="checkedin">Checked In</option>
                    <option value="checkedout">Checked Out</option>
                  </select>
                </div>
              )}
              <div className="flex justify-between items-center flex-wrap gap-2">
                <button type="button" onClick={closeBookingModal} className="px-4 py-2 rounded border">Cancel</button>
                {isEditingBooking && <button type="button" onClick={handleCancelBooking} className="bg-red-600 text-white px-4 py-2 rounded">Cancel Booking</button>}
                {!newGuestMode && !editingGuestMode && <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{isEditingBooking ? 'Update' : 'Book'}</button>}
              </div>
            </form>
          </div>
        </div>
      )}

      {blockModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 md:w-96 relative">
            <h2 className="text-xl font-semibold mb-4">{isEditingBlock ? 'Edit Block' : 'New Block'}</h2>
            {blockFormError && <div className="text-red-600 mb-2">{blockFormError}</div>}
            <form onSubmit={handleBlockSubmit} className="space-y-4">
              <div>
                <label className="block font-medium">Room:</label>
                <select className="w-full border px-2 py-1 rounded" value={blockRoom} onChange={(e) => setBlockRoom(e.target.value)}>
                  <option value="">— Select Room —</option>
                  {resources.map((r) => (<option key={r.id} value={r.id}>{`Room ${r.number}`}</option>))}
                </select>
              </div>
              <div>
                <label className="block font-medium">Reason (optional):</label>
                <input type="text" className="w-full border px-2 py-1 rounded" placeholder="e.g. Maintenance" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
              </div>
              <div>
                <label className="block font-medium">Block Start:</label>
                <input type="date" className="w-full border px-2 py-1 rounded" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
              </div>
              <div>
                <label className="block font-medium">Block End:</label>
                <input type="date" className="w-full border px-2 py-1 rounded" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
              </div>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <button type="button" onClick={closeBlockModal} className="px-4 py-2 rounded border">Cancel</button>
                {isEditingBlock && <button type="button" onClick={handleUnblock} className="bg-red-600 text-white px-4 py-2 rounded">Unblock</button>}
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{isEditingBlock ? 'Update' : 'Block'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMobile && mobileBookingRoom && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-3 border-t-2 shadow-lg z-40">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg">Book Room {mobileBookingRoom.number}</h3>
            <button onClick={() => setMobileBookingRoom(null)} className="font-bold text-xl">&times;</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium">Check-In</label>
              <input type="date" className="w-full border px-2 py-1 rounded" value={mobileCheckin} onChange={(e) => setMobileCheckin(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium">Check-Out</label>
              <input type="date" className="w-full border px-2 py-1 rounded" value={mobileCheckout} onChange={(e) => setMobileCheckout(e.target.value)} />
            </div>
            <button onClick={handleMobileBookingSubmit} className="bg-blue-600 text-white px-4 py-2 rounded mt-2 sm:mt-0 self-end">
              Book Now
            </button>
          </div>
        </div>
      )}

      <ConfirmModal visible={confirmModalVisible} title={confirmTitle} message={confirmMessage} onConfirm={handleConfirmYes} onCancel={handleConfirmNo} />
    </div>
  );
}

export default DragDropContext(HTML5Backend)(CalendarScheduler);
