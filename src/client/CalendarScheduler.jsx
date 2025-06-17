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
      <div className="bg-white p-6 rounded shadow w-80">
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

  const [blockedRoomsAll, setBlockedRoomsAll] = useState([]);
  // ────────────────────────────────────────────────────────────
  // SchedulerData initialization (month view, no headers/popovers)
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
  // Core state hooks: resources, events, filters, loading/mode
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
  const [bookingPrice, setBookingPrice] = useState('');           // ← new
  const [roomPrices, setRoomPrices] = useState({}); 

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
  // Refs for guest input wrapper & scheduler container
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
        // If a hotelId was passed in, use that; otherwise fall back
         const pick = data.find(h => h.id === initialHotelId) 
                       ? initialHotelId 
                      : (data.length && data[0].id);
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
        // Normalize rooms
        const rooms = Array.isArray(roomsResp)
          ? roomsResp
          : roomsResp.data || [];
        setRoomTypes([...new Set(rooms.map((r) => r.type))].sort());
        
        // Build a lookup of default prices by room id
        const prices = {};
        rooms.forEach(r => { prices[r.id] = r.price; });
        setRoomPrices(prices);

        const filteredRooms = rooms.filter(
          (r) => selectedRoomType === 'all' || r.type === selectedRoomType
        );
const resourceList = filteredRooms.map((r) => {
  const isBlocked = blockedRoomsAll.includes(r.id);
  return {
    id: r.id,
    number: r.number,
    name: (
      <div
        onClick={(e) => {
          e.stopPropagation();
          toggleBlockAll(r.id);
        }}
        style={{
          cursor: 'pointer',
          textDecoration: 'underline',
          display: 'block',           // make it fill the cell
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',    // include padding in height
          padding: '4px 8px',         // optional, for some inner spacing
          backgroundColor: isBlocked 
            ? 'rgba(255, 0, 0, 0.2)'  // translucent red fill
            : undefined,
          color: isBlocked 
            ? 'red'                   // red text
            : undefined,
        }}
      >
        {`Room ${r.number} (${r.type})`}
      </div>
    ),
  };
});



        // Convert bookings to scheduler events
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
            price: e.price,
            bgColor,
            status: e.status,
            guestId: e.guestId,
            type: 'booking',
          };
        });

        // Convert blocks to scheduler events
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

        // Apply to scheduler
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
  // Hide guest suggestions on outside click
  // ────────────────────────────────────────────────────────────
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
    return () =>
      window.removeEventListener('click', handleClickOutside);
  }, []);

  // Paint the entire "sidebar" row red for blocked rooms
// After
useEffect(() => {
  const wrapper = schedulerWrapperRef.current;
  if (!wrapper) return;

  // Grab every table with class "resource-table"
  const tables = wrapper.querySelectorAll('table.resource-table');
  if (tables.length === 0) return;

  // The *last* one is the sidebar listing your rooms
  const resourceTable = tables[tables.length - 1];

  const rows = Array.from(resourceTable.querySelectorAll('tbody tr'));
  rows.forEach((tr, idx) => {
    const cell = tr.querySelector('td');
    const roomId = resources[idx]?.id;
    if (blockedRoomsAll.includes(roomId)) {
      cell.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
      cell.style.color = 'red';
    } else {
      cell.style.backgroundColor = '';
      cell.style.color = '';
    }
  });
}, [resources, blockedRoomsAll]);



  // ────────────────────────────────────────────────────────────
  // Slot selection: handles both block-mode and booking-mode
  // ────────────────────────────────────────────────────────────
const onSelectSlot = (schedulerData, slotId, slotName, start, end) => {
  // Blocked-all rooms cannot be selected
  if (blockedRoomsAll.includes(slotId)) {
    toast.error('This room is fully blocked.');
    return;
  }
  const startDate = moment(start).format('YYYY-MM-DD');
  const endDate = moment(end).format('YYYY-MM-DD');

  if (isBlockMode) {
    // Prevent blocking if it overlaps an existing booking
    const bookingOverlap = events.find(ev =>
      ev.type === 'booking' &&
      ev.resourceId === slotId &&
      moment(start).isBefore(moment(ev.end)) &&
      moment(end).isAfter(moment(ev.start))
    );
    if (bookingOverlap) {
      toast.error(
        `Cannot block: room already booked from ` +
        `${moment(bookingOverlap.start).format('YYYY-MM-DD')} to ` +
        `${moment(bookingOverlap.end).format('YYYY-MM-DD')}`
      );
      return;
    }

    // Open block modal
    setBlockRoom(slotId);
    setBlockStart(startDate);
    setBlockEnd(endDate);
    setBlockReason('');
    setBlockFormError('');
    setIsEditingBlock(false);
    setEditingBlockId(null);
    setBlockModalVisible(true);

  } else {
    // Prevent booking if it overlaps any existing block or booking
    const overlap = events.find(ev =>
      (ev.type === 'block' || ev.type === 'booking') &&
      ev.resourceId === slotId &&
      moment(start).isBefore(moment(ev.end)) &&
      moment(end).isAfter(moment(ev.start))
    );
    if (overlap) {
      if (overlap.type === 'block') {
        toast.error(
          `Cannot book: room blocked from ` +
          `${moment(overlap.start).format('YYYY-MM-DD')} to ` +
          `${moment(overlap.end).format('YYYY-MM-DD')}`
        );
      } else {
        toast.error(
          `Cannot book: room already booked from ` +
          `${moment(overlap.start).format('YYYY-MM-DD')} to ` +
          `${moment(overlap.end).format('YYYY-MM-DD')}`
        );
      }
      return;
    }

    // Open booking modal
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

    // Focus guest input and show suggestions
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
    if (!selectedRoom)
      return setBookingFormError('Please select a room.');
    if (!selectedGuest)
      return setBookingFormError('Please select a guest.');
    const startISO = `${bookingStart}T12:00:00`;
    const endISO = `${bookingEnd}T12:00:00`;
    if (new Date(startISO) >= new Date(endISO)) {
      return setBookingFormError(
        'Check-out must be after check-in.'
      );
    }
    try {
      if (isEditingBooking && editingBookingId) {
        await fetchJSON(
          `/api/bookings/${editingBookingId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              room: selectedRoom,
              guest: selectedGuest,
              startDate: startISO,
              endDate: endISO,
              status: bookingStatus,
              price: bookingPrice,
            }),
          }
        );
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
          await fetchJSON(
            `/api/bookings/${editingBookingId}`,
            { method: 'DELETE' }
          );
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
    if (!blockRoom)
      return setBlockFormError('Please select a room.');
    const startISO = `${blockStart}T00:00:00`;
    const endISO = `${blockEnd}T23:59:59`;
    if (new Date(startISO) >= new Date(endISO)) {
      return setBlockFormError(
        'Block end must be after block start.'
      );
    }
    try {
      if (isEditingBlock && editingBlockId) {
        await fetchJSON(`/api/blocks/${editingBlockId}`, {
          method: 'DELETE',
        });
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

  const handleUnblock = async () => {
    if (!editingBlockId) return;
    showConfirm(
      'Unblock this room?',
      async () => {
        try {
          await fetchJSON(
            `/api/blocks/${editingBlockId}`,
            { method: 'DELETE' }
          );
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
  // Update booking on drag or resize
  // ────────────────────────────────────────────────────────────
  const updateBooking = (id, body) =>
    fetchJSON(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
      .then(loadData)
      .catch((err) =>
        console.error('Booking update failed:', err)
      );

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

  // ────────────────────────────────────────────────────────────
  // Event item renderers: main template & popover
  // ────────────────────────────────────────────────────────────
  const eventItemTemplateResolver = (
    sd,
    event,
    start,
    end,
    status,
    style
  ) => {
    let bgColor = event.bgColor;
    const borderWidth = status === 'start' ? 4 : 1;
    const mustBeHeight = status === 'start' ? 28 : 22;
    return (
      <div
        key={event.id}
        title={
          event.type === 'booking'
            ? `Guest: ${event.title}\nCheck-In: ${moment(
                event.start
              ).format('YYYY-MM-DD')}\nCheck-Out: ${moment(
                event.end
              ).format('YYYY-MM-DD')}\nStatus: ${
                event.status
              }`
            : `Block: ${event.title}\nFrom: ${moment(
                event.start
              ).format('YYYY-MM-DD')}\nTo: ${moment(
                event.end
              ).format('YYYY-MM-DD')}`
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
        <span style={{ paddingRight: '16px' }}>
          {event.title}
        </span>
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
      <div
        className="p-2 bg-white rounded shadow"
        style={{ minWidth: '200px', ...cleanedStyle }}
      >
        {event.type === 'booking' ? (
          <>
            <div className="font-semibold mb-1">
              {event.title}
            </div>
            <div className="text-sm mb-1">
              <strong>Status:</strong> {event.status}
            </div>
            <div className="text-sm mb-1">
              <strong>Check-In:</strong>{' '}
              {moment(event.start).format('YYYY-MM-DD')}
            </div>
            <div className="text-sm mb-1">
              <strong>Check-Out:</strong>{' '}
              {moment(event.end).format('YYYY-MM-DD')}
            </div>
          </>
        ) : (
          <>
            <div className="font-semibold mb-1">
              Blocked
            </div>
            <div className="text-sm mb-1">
              <strong>Reason:</strong> {event.title}
            </div>
            <div className="text-sm mb-1">
              <strong>From:</strong>{' '}
              {moment(event.start).format('YYYY-MM-DD')}
            </div>
            <div className="text-sm mb-1">
              <strong>To:</strong>{' '}
              {moment(event.end).format('YYYY-MM-DD')}
            </div>
          </>
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────
  // Block-all toggle: block/unblock entire timeline
  // ────────────────────────────────────────────────────────────
const toggleBlockAll = (roomId) => {
  setBlockedRoomsAll(curr => {
    const isBlocked = curr.includes(roomId);
    const next = isBlocked
      ? curr.filter(id => id !== roomId)
      : [...curr, roomId];
    toast.success(
      isBlocked
        ? 'Room unblocked for all dates'
        : 'Room blocked for all dates'
    );
    return next;
  });
};

  // ────────────────────────────────────────────────────────────
  // Double-click handler: open edit modal for booking or block
  // ────────────────────────────────────────────────────────────
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
      setBlockReason(
        event.title === 'Blocked' ? '' : event.title
      );
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
  // Mobile drag selection support
  // ────────────────────────────────────────────────────────────
  const handleTouchEnd = (e) => {
    const el = document.elementFromPoint(
      e.changedTouches[0].clientX,
      e.changedTouches[0].clientY
    );
    if (
      el &&
      el.classList.contains('week-event-block') === false
    ) {
      const slotId = el.getAttribute('data-resource-id');
      const start = el.getAttribute('data-start');
      const end = el.getAttribute('data-end');
      if (slotId && start && end) {
        onSelectSlot(schedulerData, slotId, null, start, end);
      }
    }
  };

  // ────────────────────────────────────────────────────────────
  // Guest autocomplete filtering
  // ────────────────────────────────────────────────────────────
  const filteredGuests = guests.filter((g) =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase())
  );

  // ────────────────────────────────────────────────────────────
  // Add new guest
  // ────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────
  // Open edit guest mode
  // ────────────────────────────────────────────────────────────
  const openGuestEdit = (guest) => {
    setEditingGuestMode(true);
    setEditingGuestName(guest.name);
    setEditingGuestEmail(guest.email);
    setEditingGuestPhone(guest.phone);
    setEditingGuestError('');
  };

  // ────────────────────────────────────────────────────────────
  // Update guest
  // ────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 relative">
      {/* Toast notifications container */}
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <h1 className="text-2xl font-bold mb-4">  
      {/*header here*/ }
      </h1>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center mb-4 space-x-4">


        {/* Room type filter */}
        <div>
          <label className="mr-2 font-semibold">
            Room Type:
          </label>
          <select
            className="border px-2 py-1 rounded"
            value={selectedRoomType}
            onChange={(e) =>
              setSelectedRoomType(e.target.value)
            }
          >
            <option value="all">All</option>
            {roomTypes.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Prev/Next buttons */}
        <div className="flex space-x-2">
          <button
            onClick={onPrev}
            className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
          >
            ←
          </button>
          <button
            onClick={onNext}
            className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
          >
            →
          </button>
        </div>

        {/* View type selector */}
        <div>
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

        {/* Block mode toggle */}
        <div className="flex items-center ml-4">
          <input
            type="checkbox"
            id="modeToggle"
            checked={isBlockMode}
            onChange={(e) =>
              setIsBlockMode(e.target.checked)
            }
          />
          <label
            htmlFor="modeToggle"
            className="ml-1 font-semibold"
          >
            Block Mode
          </label>
        </div>
      </div>

      {/* Scheduler */}
      {isLoading ? (
        <div className="text-center py-10">Loading.</div>
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
            eventItemPopoverEnabled={false}
          />
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 p-2 bg-white border rounded shadow text-sm">
        <strong>Legend:</strong>
        <div className="flex space-x-4 mt-1">
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-yellow-500 inline-block rounded" />
            Tentative
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-blue-500 inline-block rounded" />
            Booked
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-green-500 inline-block rounded" />
            Checked In
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-red-500 inline-block rounded" />
            Checked Out
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 bg-gray-600 inline-block rounded" />
            Cancelled / Block
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {bookingModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96 relative">
            <h2 className="text-xl font-semibold mb-4">
              {isEditingBooking
                ? 'Edit Booking'
                : 'New Booking'}
            </h2>
            {bookingFormError && (
              <div className="text-red-600 mb-2">
                {bookingFormError}
              </div>
            )}
            <form
              onSubmit={handleBookingSubmit}
              className="space-y-4"
            >
              {/* Room */}
              <div>
                <label className="block font-medium">
                  Room:
                </label>
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={selectedRoom}
                  onChange={(e) =>
                    setSelectedRoom(e.target.value)
                  }
                >
                  <option value="">
                    — Select Room —
                  </option>
                  {resources.map((r) => (
                    <option
                      key={r.id}
                      value={r.id}
                    >{`Room ${r.number}`}</option>
                  ))}
                </select>
              </div>


{/* Guest */}
<div ref={guestInputRef} className="relative">
  <label className="block font-medium mb-1">
    Guest:
  </label>
  <input
    type="text"
    className="w-full border px-2 py-1 rounded mb-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
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


              {/* New Guest */}
              {newGuestMode && (
                <div className="space-y-2">
                  <input
                    type="text"
                    className="w-full border px-2 py-1 rounded"
                    placeholder="Name"
                    value={newGuestName}
                    onChange={(e) =>
                      setNewGuestName(e.target.value)
                    }
                  />
                  <input
                    type="email"
                    className="w-full border px-2 py-1 rounded"
                    placeholder="Email"
                    value={newGuestEmail}
                    onChange={(e) =>
                      setNewGuestEmail(e.target.value)
                    }
                  />
                  <input
                    type="tel"
                    className="w-full border px-2 py-1 rounded"
                    placeholder="Phone"
                    value={newGuestPhone}
                    onChange={(e) =>
                      setNewGuestPhone(e.target.value)
                    }
                  />
                  <button
                    type="button"
                    onClick={handleAddNewGuest}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Save Guest
                  </button>
                  {newGuestError && (
                    <div className="text-red-600">
                      {newGuestError}
                    </div>
                  )}
                </div>
              )}

              {/* Edit Guest */}
              {editingGuestMode && (
                <div className="space-y-2">
                  <input
                    type="text"
                    className="w-full border px-2 py-1 rounded"
                    value={editingGuestName}
                    onChange={(e) =>
                      setEditingGuestName(e.target.value)
                    }
                  />
                  <input
                    type="email"
                    className="w-full border px-2 py-1 rounded"
                    value={editingGuestEmail}
                    onChange={(e) =>
                      setEditingGuestEmail(e.target.value)
                    }
                  />
                  <input
                    type="tel"
                    className="w-full border px-2 py-1 rounded"
                    value={editingGuestPhone}
                    onChange={(e) =>
                      setEditingGuestPhone(e.target.value)
                    }
                  />
                  <button
                    type="button"
                    onClick={handleGuestUpdate}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Update Guest
                  </button>
                  {editingGuestError && (
                    <div className="text-red-600">
                      {editingGuestError}
                    </div>
                  )}
                </div>
              )}

              {/* Price */}
              <div>
                <label className="block font-medium">Price</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border px-2 py-1 rounded"
                  value={bookingPrice}
                  onChange={e => setBookingPrice(e.target.value)}
                />
              </div>

              {/* Dates */}
              <div>
                <label className="block font-medium">
                  Check-In
                </label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={bookingStart}
                  onChange={(e) =>
                    setBookingStart(e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block font-medium">
                  Check-Out
                </label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={bookingEnd}
                  onChange={(e) =>
                    setBookingEnd(e.target.value)
                  }
                />
              </div>

              {/* Status */}
              {isEditingBooking && (
                <div>
                  <label className="block font-medium">
                    Status
                  </label>
                  <select
                    className="w-full border px-2 py-1 rounded"
                    value={bookingStatus}
                    onChange={(e) =>
                      setBookingStatus(e.target.value)
                    }
                  >
                    <option value="tentative">
                      Tentative
                    </option>
                    <option value="booked">Booked</option>
                    <option value="checkedin">
                      Checked In
                    </option>
                    <option value="checkedout">
                      Checked Out
                    </option>
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
                    {isEditingBooking
                      ? 'Update'
                      : 'Book'}
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
              <div className="text-red-600 mb-2">
                {blockFormError}
              </div>
            )}
            <form
              onSubmit={handleBlockSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block font-medium">
                  Room:
                </label>
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={blockRoom}
                  onChange={(e) =>
                    setBlockRoom(e.target.value)
                  }
                >
                  <option value="">
                    — Select Room —
                  </option>
                  {resources.map((r) => (
                    <option
                      key={r.id}
                      value={r.id}
                    >{`Room ${r.number}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium">
                  Reason (optional):
                </label>
                <input
                  type="text"
                  className="w-full border px-2 py-1 rounded"
                  placeholder="e.g. Maintenance"
                  value={blockReason}
                  onChange={(e) =>
                    setBlockReason(e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block font-medium">
                  Block Start:
                </label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={blockStart}
                  onChange={(e) =>
                    setBlockStart(e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block font-medium">
                  Block End:
                </label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={blockEnd}
                  onChange={(e) =>
                    setBlockEnd(e.target.value)
                  }
                />
              </div>
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
                    Unblock
                  </button>
                )}
                {!isEditingBlock && (
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Block
                  </button>
                )}
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
